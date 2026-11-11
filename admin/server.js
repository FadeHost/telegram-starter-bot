import express from "express"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT || 3000)
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex")
const MASTER_USER = process.env.MASTER_USERNAME || "master"
const MASTER_PASS = process.env.MASTER_PASSWORD || "CHANGE-ME-NOW-2026"
const DB_FILE = path.join(__dirname, "data.json")

app.use(express.json({ limit: "100kb" }))
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "public")))

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) }
  catch { return { users: [], transactions: [], notes: [] } }
}
function writeDB(db) {
  const tmp = DB_FILE + ".tmp"
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_FILE)
}
function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex")
}
function tokenFor(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url")
  return payload + "." + sign(payload)
}
function auth(req, res, next) {
  const token = req.headers.cookie?.split(";").map(x => x.trim()).find(x => x.startsWith("lion_session="))?.slice(13)
  if (!token) return res.status(401).json({ error: "يلزم تسجيل الدخول" })
  const [payload, signature] = token.split(".")
  if (!payload || !signature || sign(payload) !== signature) return res.status(401).json({ error: "جلسة غير صالحة" })
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (session.exp < Date.now()) return res.status(401).json({ error: "انتهت الجلسة" })
    req.actor = session.user
    next()
  } catch { return res.status(401).json({ error: "جلسة غير صالحة" }) }
}
const roles = ["SUPER_MASTER", "AGENT", "CASHIER"]
const labels = { MASTER: "المدير الرئيسي", SUPER_MASTER: "رئيس الوكلاء", AGENT: "الوكيل", CASHIER: "الكاشير", PLAYER: "لاعب" }

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {}
  const a = Buffer.from(String(username || ""))
  const b = Buffer.from(String(MASTER_USER))
  const p = Buffer.from(String(password || ""))
  const q = Buffer.from(String(MASTER_PASS))
  if (a.length !== b.length || p.length !== q.length || !crypto.timingSafeEqual(a,b) || !crypto.timingSafeEqual(p,q))
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" })
  res.setHeader("Set-Cookie", `lion_session=${tokenFor(MASTER_USER)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` + (process.env.NODE_ENV === "production" ? "; Secure" : ""))
  res.json({ success: true, user: MASTER_USER })
})
app.post("/api/logout", (req,res) => { res.setHeader("Set-Cookie", "lion_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"); res.json({success:true}) })
app.get("/api/me", auth, (req,res) => res.json({ user:req.actor, role:"MASTER" }))
app.get("/api/data", auth, (req,res) => {
  const db=readDB()
  const totalBalance=db.users.reduce((s,u)=>s+Number(u.balance||0),0)
  res.json({ users:db.users, transactions:db.transactions.slice(-100).reverse(), stats:{ users:db.users.length, agents:db.users.filter(u=>roles.includes(u.role)).length, players:db.users.filter(u=>u.role==="PLAYER").length, balance:totalBalance } })
})
app.post("/api/users", auth, (req,res) => {
  const {username,password,role,parentId,phone}=req.body||{}
  if (!username || !password || String(password).length<6) return res.status(400).json({error:"أدخل اسم المستخدم وكلمة مرور من 6 أحرف على الأقل"})
  if (!roles.includes(role) && role!=="PLAYER") return res.status(400).json({error:"نوع الحساب غير صحيح"})
  const db=readDB()
  if(db.users.some(u=>u.username.toLowerCase()===String(username).toLowerCase())) return res.status(409).json({error:"اسم المستخدم مستخدم مسبقاً"})
  const user={id:crypto.randomUUID(),username:String(username).trim(),passwordHash:crypto.scryptSync(String(password), "lion-panel", 32).toString("hex"),role,parentId:parentId||null,phone:String(phone||""),balance:0,createdAt:new Date().toISOString(),active:true}
  db.users.push(user); writeDB(db)
  res.json({success:true,user:{...user,passwordHash:undefined}})
})
app.post("/api/users/:id/balance", auth, (req,res) => {
  const amount=Number(req.body?.amount), type=req.body?.type, reason=String(req.body?.reason||"تعديل رصيد").slice(0,180)
  if(!Number.isFinite(amount)||amount<=0||amount>100000000||!["add","subtract"].includes(type)) return res.status(400).json({error:"قيمة العملية غير صحيحة"})
  const db=readDB(), user=db.users.find(u=>u.id===req.params.id)
  if(!user) return res.status(404).json({error:"الحساب غير موجود"})
  if(type==="subtract" && Number(user.balance)<amount) return res.status(400).json({error:"الرصيد غير كافٍ"})
  user.balance=Number(user.balance)+(type==="add"?amount:-amount)
  db.transactions.push({id:crypto.randomUUID(),userId:user.id,username:user.username,type,amount,reason,by:req.actor,createdAt:new Date().toISOString()})
  writeDB(db); res.json({success:true,balance:user.balance})
})
app.patch("/api/users/:id/status", auth, (req,res) => {
  const db=readDB(), user=db.users.find(u=>u.id===req.params.id)
  if(!user) return res.status(404).json({error:"الحساب غير موجود"})
  user.active=!user.active; writeDB(db); res.json({success:true,active:user.active})
})
app.get("/api/health", (req,res)=>res.json({ok:true,service:"LION MASTER PANEL"}))
app.get("*", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")))
export function startAdminServer() {
  app.listen(PORT, "0.0.0.0", ()=> {
    console.log(`[LION MASTER] dashboard listening on port ${PORT}`)
    if(MASTER_PASS==="CHANGE-ME-NOW-2026") console.warn("[SECURITY] Set MASTER_PASSWORD and SESSION_SECRET in FadeHost environment before public use.")
  })
}
