
import { InlineKeyboard } from "grammy"
import { mkdir, readFile, writeFile, rename } from "node:fs/promises"

const DATA_DIR = new URL("../data/", import.meta.url)
const DATA_FILE = new URL("../data/alboss.json", import.meta.url)

const DEFAULTS = {
  links: true,
  spam: true,
  welcome: true,
  filter: true,
  warnLimit: 3,
  muteMinutes: 10,
  badWords: ["يا حمار", "غبي"]
}

let db = { groups: {} }
let saving = Promise.resolve()
const flood = new Map()

async function load() {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    db = JSON.parse(await readFile(DATA_FILE, "utf8"))
    if (!db.groups) db = { groups: {} }
  } catch (e) {
    if (e.code !== "ENOENT") console.error(e)
    await save()
  }
}

async function save() {
  saving = saving.then(async () => {
    await mkdir(DATA_DIR, { recursive: true })
    const temp = new URL("../data/alboss.tmp", import.meta.url)
    await writeFile(temp, JSON.stringify(db, null, 2))
    await rename(temp, DATA_FILE)
  }).catch(console.error)
  return saving
}

function group(ctx) {
  const id = String(ctx.chat.id)

  db.groups[id] ||= {
    title: ctx.chat.title || "مجموعة",
    settings: { ...DEFAULTS, badWords: [...DEFAULTS.badWords] },
    warnings: {},
    points: {},
    quiz: null
  }

  const g = db.groups[id]
  g.title = ctx.chat.title || g.title
  g.settings = { ...DEFAULTS, ...g.settings }
  g.warnings ||= {}
  g.points ||= {}

  return g
}

function inGroup(ctx) {
  return ["group", "supergroup"].includes(ctx.chat?.type)
}

async function admin(ctx, id = ctx.from?.id) {
  if (!inGroup(ctx) || !id) return false

  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, id)
    return ["creator", "administrator"].includes(member.status)
  } catch {
    return false
  }
}

async function guard(ctx) {
  if (!inGroup(ctx)) {
    await ctx.reply("الأمر هذا يخدم داخل المجموعات بس.")
    return false
  }

  if (!(await admin(ctx))) {
    await ctx.reply("الأمر هذا للمشرفين بس.")
    return false
  }

  return true
}

async function target(ctx) {
  const user = ctx.message?.reply_to_message?.from

  if (!user || user.is_bot) {
    await ctx.reply("رد على رسالة العضو واكتب الأمر.")
    return null
  }

  if (user.id === ctx.from.id) {
    await ctx.reply("ما تقدرش تنفذ الأمر على روحك.")
    return null
  }

  if (await admin(ctx, user.id)) {
    await ctx.reply("ما نقدرش ننفذ الأمر على مشرف.")
    return null
  }

  return user
}

function panel(g) {
  const s = g.settings
  const label = v => v ? "شغال ✅" : "موقوف ❌"

  return new InlineKeyboard()
    .text(`الروابط: ${label(s.links)}`, "toggle:links").row()
    .text(`السبام: ${label(s.spam)}`, "toggle:spam").row()
    .text(`الترحيب: ${label(s.welcome)}`, "toggle:welcome").row()
    .text(`الكلمات: ${label(s.filter)}`, "toggle:filter")
}

const jokes = [
  "واحد مشى للطبيب قاله كل ما نشرب قهوة عيني توجعني، قاله نحي الملعقة من الكاس 😂",
  "واحد كسول حط منبه، ولما رن قاله خمس دقايق ونرد عليك 😂",
  "واحد قال لصاحبه نبي نفتح مشروع مضمون، قاله افتح مظلة وقت المطر 😂"
]

const quizzes = [
  { q: "شنو الشي اللي كل ما تاخذ منه يكبر؟", a: ["الحفرة"] },
  { q: "عنده أسنان وما يعضش؟", a: ["المشط"] },
  { q: "شنو يمشي بلا رجلين ويبكي بلا عينين؟", a: ["السحاب", "الغيم"] }
]

export function registerCommands(bot) {
  const ready = load()

  bot.use(async (ctx, next) => {
    await ready
    await next()
  })

  bot.command("start", ctx =>
    ctx.reply("🔥 هلا بيك في ALBOSS BOT\nبوت إدارة المجموعات باللهجة الليبية.\nاكتب /help للأوامر.")
  )

  bot.command("help", ctx =>
    ctx.reply(
      "🤖 ALBOSS BOT\n\n" +
      "📌 عام:\n/start /help /id /rules /panel\n\n" +
      "🛡️ إدارة (بالرد على العضو):\n" +
      "/ban حظر\n/kick طرد\n/unban فك الحظر\n" +
      "/mute [دقائق] كتم\n/unmute فك الكتم\n" +
      "/warn تحذير\n/warnings التحذيرات\n/resetwarn تصفير التحذيرات\n" +
      "/del حذف رسالة\n/purge [عدد] حذف رسائل\n/lock قفل الكتابة\n/unlock فتح الكتابة\n\n" +
      "⚙️ حماية:\n/addword كلمة\n/delword كلمة\n\n" +
      "🎮 ترفيه:\n/joke نكتة\n/quiz لغز\n/points نقاطك\n/top الترتيب"
    )
  )

  bot.command("id", ctx =>
    ctx.reply(`المجموعة: ${ctx.chat.id}\nحسابك: ${ctx.from?.id}`)
  )

  bot.command("rules", ctx =>
    ctx.reply(
      "📜 قوانين المجموعة:\n" +
      "1- الاحترام واجب.\n" +
      "2- ممنوع السب.\n" +
      "3- ممنوع الإعلانات دون إذن.\n" +
      "4- احترم المشرفين."
    )
  )

  bot.command("ping", ctx => ctx.reply("pong 🏓"))

  bot.command("panel", async ctx => {
    if (!(await guard(ctx))) return

    const g = group(ctx)
    await save()

    await ctx.reply("⚙️ إعدادات المجموعة\nاضغط على الزر للتشغيل أو الإيقاف:", {
      reply_markup: panel(g)
    })
  })

  bot.callbackQuery(/^toggle:(links|spam|welcome|filter)$/, async ctx => {
    if (!inGroup(ctx) || !(await admin(ctx))) {
      return ctx.answerCallbackQuery({
        text: "الإعدادات للمشرفين بس.",
        show_alert: true
      })
    }

    const g = group(ctx)
    const key = ctx.match[1]

    g.settings[key] = !g.settings[key]

    await save()
    await ctx.editMessageReplyMarkup({ reply_markup: panel(g) })
    await ctx.answerCallbackQuery({ text: "تم تحديث الإعدادات ✅" })
  })

  bot.command("ban", async ctx => {
    if (!(await guard(ctx))) return
    const u = await target(ctx)
    if (!u) return

    try {
      await ctx.api.banChatMember(ctx.chat.id, u.id)
      await ctx.reply(`🚫 تم حظر ${u.first_name}.`)
    } catch {
      await ctx.reply("فشل الحظر، راجع صلاحيات البوت.")
    }
  })

  bot.command("kick", async ctx => {
    if (!(await guard(ctx))) return
    const u = await target(ctx)
    if (!u) return

    try {
      await ctx.api.banChatMember(ctx.chat.id, u.id)
      await ctx.api.unbanChatMember(ctx.chat.id, u.id)
      await ctx.reply(`👋 تم طرد ${u.first_name}.`)
    } catch {
      await ctx.reply("فشل الطرد.")
    }
  })

  bot.command("unban", async ctx => {
    if (!(await guard(ctx))) return

    const u = ctx.message?.reply_to_message?.from
    if (!u) return ctx.reply("رد على رسالة العضو المحظور.")

    try {
      await ctx.api.unbanChatMember(ctx.chat.id, u.id, {
        only_if_banned: true
      })
      await ctx.reply("✅ تم فك الحظر.")
    } catch {
      await ctx.reply("تعذر فك الحظر.")
    }
  })

  bot.command("mute", async ctx => {
    if (!(await guard(ctx))) return
    const u = await target(ctx)
    if (!u) return

    const minutes = Math.max(
      1,
      Math.min(10080, Number(ctx.match) || group(ctx).settings.muteMinutes)
    )

    try {
      await ctx.api.restrictChatMember(ctx.chat.id, u.id, {
        permissions: { can_send_messages: false },
        until_date: Math.floor(Date.now() / 1000) + minutes * 60
      })

      await ctx.reply(`🔇 تم كتم ${u.first_name} لمدة ${minutes} دقيقة.`)
    } catch {
      await ctx.reply("فشل الكتم، راجع صلاحيات البوت.")
    }
  })

  bot.command("unmute", async ctx => {
    if (!(await guard(ctx))) return
    const u = await target(ctx)
    if (!u) return

    try {
      await ctx.api.restrictChatMember(ctx.chat.id, u.id, {
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true
        }
      })

      await ctx.reply(`🔊 تم فك كتم ${u.first_name}.`)
    } catch {
      await ctx.reply("فشل فك الكتم.")
    }
  })

  bot.command("warn", async ctx => {
    if (!(await guard(ctx))) return
    const u = await target(ctx)
    if (!u) return

    const g = group(ctx)
    const n = (g.warnings[u.id] || 0) + 1
    g.warnings[u.id] = n

    await save()

    if (n >= g.settings.warnLimit) {
      try {
        await ctx.api.banChatMember(ctx.chat.id, u.id)
        delete g.warnings[u.id]
        await save()
        return ctx.reply(`⛔ ${u.first_name} وصل 3 تحذيرات وتم حظره.`)
      } catch {
        return ctx.reply("وصل للحد الأقصى لكن فشل الحظر التلقائي.")
      }
    }

    await ctx.reply(`⚠️ تحذير لـ ${u.first_name}: ${n}/3`)
  })

  bot.command("warnings", async ctx => {
    if (!(await guard(ctx))) return

    const u = ctx.message?.reply_to_message?.from
    if (!u) return ctx.reply("رد على رسالة العضو.")

    await ctx.reply(
      `تحذيرات ${u.first_name}: ${group(ctx).warnings[u.id] || 0}/3`
    )
  })

  bot.command("resetwarn", async ctx => {
    if (!(await guard(ctx))) return

    const u = ctx.message?.reply_to_message?.from
    if (!u) return ctx.reply("رد على رسالة العضو.")

    delete group(ctx).warnings[u.id]
    await save()
    await ctx.reply("✅ تم تصفير التحذيرات.")
  })

  bot.command("del", async ctx => {
    if (!(await guard(ctx))) return

    const m = ctx.message.reply_to_message
    if (!m) return ctx.reply("رد على الرسالة واكتب /del.")

    try {
      await ctx.api.deleteMessage(ctx.chat.id, m.message_id)
      await ctx.deleteMessage()
    } catch {
      await ctx.reply("تعذر حذف الرسالة.")
    }
  })

  bot.command("purge", async ctx => {
    if (!(await guard(ctx))) return

    const m = ctx.message.reply_to_message
    if (!m) return ctx.reply("رد على أول رسالة واكتب /purge.")

    const count = Math.max(1, Math.min(100, Number(ctx.match) || 10))
    let deleted = 0

    for (let id = m.message_id; id < m.message_id + count; id++) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, id)
        deleted++
      } catch {}
    }

    try {
      await ctx.deleteMessage()
    } catch {}

    await ctx.reply(`🧹 تم حذف ${deleted} رسالة.`)
  })

  bot.command("lock", async ctx => {
    if (!(await guard(ctx))) return

    try {
      await ctx.api.setChatPermissions(ctx.chat.id, {
        can_send_messages: false
      })
      await ctx.reply("🔒 تم قفل الكتابة.")
    } catch {
      await ctx.reply("فشل القفل. راجع صلاحيات البوت.")
    }
  })

  bot.command("unlock", async ctx => {
    if (!(await guard(ctx))) return

    try {
      await ctx.api.setChatPermissions(ctx.chat.id, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      })
      await ctx.reply("🔓 تم فتح الكتابة.")
    } catch {
      await ctx.reply("فشل فتح المجموعة.")
    }
  })

  bot.command("addword", async ctx => {
    if (!(await guard(ctx))) return

    const word = (ctx.match || "").trim().toLowerCase()
    if (!word) return ctx.reply("اكتب الكلمة بعد الأمر.")

    const list = group(ctx).settings.badWords
    if (!list.includes(word)) list.push(word)

    await save()
    await ctx.reply("✅ تمت إضافة الكلمة.")
  })

  bot.command("delword", async ctx => {
    if (!(await guard(ctx))) return

    const word = (ctx.match || "").trim().toLowerCase()
    if (!word) return ctx.reply("اكتب الكلمة بعد الأمر.")

    const g = group(ctx)
    g.settings.badWords = g.settings.badWords.filter(x => x !== word)

    await save()
    await ctx.reply("✅ تم حذف الكلمة.")
  })

  bot.command("joke", ctx =>
    ctx.reply(jokes[Math.floor(Math.random() * jokes.length)])
  )

  bot.command("quiz", async ctx => {
    if (!inGroup(ctx)) return ctx.reply("الألغاز تخدم داخل المجموعات.")

    const q = quizzes[Math.floor(Math.random() * quizzes.length)]
    group(ctx).quiz = q

    await save()
    await ctx.reply(`🧠 لغز:\n${q.q}\nأول إجابة صحيحة تتحصل على نقطة!`)
  })

  bot.command("points", async ctx => {
    if (!inGroup(ctx)) return

    await ctx.reply(`⭐ نقاطك: ${group(ctx).points[ctx.from.id] || 0}`)
  })

  bot.command("top", async ctx => {
    if (!inGroup(ctx)) return

    const entries = Object.entries(group(ctx).points)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    if (!entries.length) {
      return ctx.reply("ما فيش نقاط توا. اكتب /quiz وابدأ اللعب.")
    }

    const lines = []

    for (let i = 0; i < entries.length; i++) {
      let name = `عضو ${entries[i][0]}`

      try {
        name = (await ctx.api.getChatMember(
          ctx.chat.id,
          Number(entries[i][0])
        )).user.first_name
      } catch {}

      lines.push(`${i + 1}- ${name}: ${entries[i][1]} نقطة`)
    }

    await ctx.reply("🏆 ترتيب المجموعة:\n" + lines.join("\n"))
  })

  bot.on("message:new_chat_members", async ctx => {
    const g = group(ctx)
    await save()

    if (!g.settings.welcome) return

    for (const u of ctx.message.new_chat_members) {
      if (!u.is_bot) {
        await ctx.reply(`🌹 يا مرحبتين ${u.first_name}، نورت المجموعة!`)
      }
    }
  })

  bot.on("message:text", async ctx => {
    if (!inGroup(ctx) || ctx.from?.is_bot) return

    const g = group(ctx)
    const message = ctx.message.text

    if (message.startsWith("/")) return

    if (
      g.quiz &&
      g.quiz.a.some(a => a.toLowerCase() === message.trim().toLowerCase())
    ) {
      g.points[ctx.from.id] = (g.points[ctx.from.id] || 0) + 1
      g.quiz = null

      await save()
      return ctx.reply(`🎉 إجابة صحيحة يا ${ctx.from.first_name}! خديت نقطة ⭐`)
    }

    if (await admin(ctx)) return

    const link =
      ctx.message.entities?.some(e =>
        ["url", "text_link"].includes(e.type)
      ) || /https?:\/\/|www\.|t\.me\//i.test(message)

    if (g.settings.links && link) {
      try {
        await ctx.deleteMessage()
        await ctx.reply(`🔗 ${ctx.from.first_name}، الروابط ممنوعة.`)
      } catch {}
      return
    }

    if (
      g.settings.filter &&
      g.settings.badWords.some(w => w && message.toLowerCase().includes(w))
    ) {
      try {
        await ctx.deleteMessage()
        await ctx.reply(`🚫 ${ctx.from.first_name}، ممنوع الكلام هذا.`)
      } catch {}
      return
    }

    if (g.settings.spam) {
      const key = `${ctx.chat.id}:${ctx.from.id}`
      const now = Date.now()
      const recent = (flood.get(key) || []).filter(t => now - t < 5000)

      recent.push(now)
      flood.set(key, recent)

      if (recent.length > 5) {
        try {
          await ctx.deleteMessage()
          await ctx.reply(`⚠️ ${ctx.from.first_name}، خفّف الرسائل المتكررة.`)
        } catch {}
      }
    }
  })

  console.log("[ALBOSS] تم تحميل الأوامر")
}
