
import { InlineKeyboard } from "grammy"

const API_URL = "https://api.gameskinbo.com"

async function getPlayer(uid) {
  const apiKey = process.env.FREE_FIRE_API_KEY

  if (!apiKey) {
    throw new Error("API_KEY_MISSING")
  }

  const url = new URL("/ff-info/get", API_URL)
  url.searchParams.set("uid", uid)

  const response = await fetch(url, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(20000),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("API_KEY_INVALID")
    }
    if (response.status === 429) {
      throw new Error("API_LIMIT")
    }
    throw new Error(data.error || "API_ERROR")
  }

  return data
}

function findValue(obj, names) {
  if (!obj || typeof obj !== "object") return undefined

  for (const name of names) {
    const key = Object.keys(obj).find(
      k => k.toLowerCase() === name.toLowerCase()
    )
    if (key && obj[key] != null && obj[key] !== "") {
      return obj[key]
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findValue(value, names)
      if (found !== undefined) return found
    }
  }

  return undefined
}

function show(value) {
  return value === undefined ? "তথ্য পাওয়া যায়নি" : String(value)
}

async function runLookup(ctx, type) {
  const uid = String(ctx.match || "").trim()

  if (!/^\d{5,20}$/.test(uid)) {
    return ctx.reply(
      `ব্যবহার: /${type} UID\nউদাহরণ: /${type} 123456789`
    )
  }

  await ctx.reply("⏳ Free Fire তথ্য খোঁজা হচ্ছে...")

  try {
    const data = await getPlayer(uid)

    if (data.error) {
      return ctx.reply(`API: ${data.error}`)
    }

    const name = findValue(data, ["AccountName", "nickname"])
    const level = findValue(data, ["AccountLevel", "level"])
    const region = findValue(data, ["AccountRegion", "region"])
    const likes = findValue(data, ["AccountLikes", "likes"])
    const brRank = findValue(data, ["BrMaxRank", "brRank"])
    const brPoints = findValue(data, ["BrRankPoint", "brRankPoint"])
    const csRank = findValue(data, ["CsMaxRank", "csRank"])
    const csPoints = findValue(data, ["CsRankPoint", "csRankPoint"])
    const guild = findValue(data, [
      "GuildName", "guildName", "GuildID", "GuildId"
    ])

    if (type === "ban") {
      return ctx.reply(
        "⚠️ এই API-এর ডকুমেন্টেশনে নির্ভরযোগ্য Ban Status endpoint নিশ্চিত করা যায়নি। তাই ব্যান স্ট্যাটাস অনুমান করে দেখানো হবে না।"
      )
    }

    if (type === "profile") {
      return ctx.reply(
        `🎮 FREE FIRE PROFILE\n\n` +
        `👤 Name: ${show(name)}\n` +
        `🆔 UID: ${uid}\n` +
        `🌍 Region: ${show(region)}\n` +
        `⭐ Level: ${show(level)}\n` +
        `👍 Likes: ${show(likes)}`
      )
    }

    if (type === "rank") {
      return ctx.reply(
        `🏆 FREE FIRE RANK\n\n` +
        `👤 Name: ${show(name)}\n` +
        `🆔 UID: ${uid}\n\n` +
        `🔫 BR Rank: ${show(brRank)}\n` +
        `📊 BR Points: ${show(brPoints)}\n` +
        `⚔️ CS Rank: ${show(csRank)}\n` +
        `📊 CS Points: ${show(csPoints)}`
      )
    }

    if (type === "guild") {
      return ctx.reply(
        `🛡️ GUILD INFORMATION\n\n` +
        `👤 Player: ${show(name)}\n` +
        `🆔 UID: ${uid}\n` +
        `🏰 Guild data: ${show(guild)}\n\n` +
        `নোট: API response-এ guild তথ্য না থাকলে এটি দেখানো যাবে না।`
      )
    }
  } catch (error) {
    const messages = {
      API_KEY_MISSING: "API key সেট করা নেই। FadeHost Environment Variables পরীক্ষা করো।",
      API_KEY_INVALID: "API key গ্রহণ করা হয়নি। Dashboard-এ key পরীক্ষা করো।",
      API_LIMIT: "API rate limit বা usage limit শেষ হয়েছে। পরে চেষ্টা করো।",
    }

    return ctx.reply(
      `❌ ${messages[error.message] || "API request ব্যর্থ হয়েছে। UID, API response ও Console Logs পরীক্ষা করো।"}`
    )
  }
}

export function registerCommands(bot) {
  bot.command("start", ctx =>
    ctx.reply(
      `Hi ${ctx.from?.first_name ?? "there"}! আমি Free Fire Info Bot.\n/help দিয়ে কমান্ড দেখো।`,
      { reply_markup: new InlineKeyboard().text("Ping me", "ping") }
    )
  )

  bot.command("help", ctx =>
    ctx.reply(
      [
        "🎮 Free Fire Info Bot",
        "",
        "/start - শুরু",
        "/help - কমান্ড তালিকা",
        "/ping - বট পরীক্ষা",
        "/id - Telegram ID",
        "/profile UID - Player Profile",
        "/rank UID - Rank & Points",
        "/guild UID - Guild তথ্য",
        "/ban UID - Ban endpoint যাচাই",
      ].join("\n")
    )
  )

  bot.command("ping", ctx => ctx.reply("pong"))

  bot.command("id", ctx =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nYour ID: ${ctx.from?.id ?? "unknown"}`)
  )

  bot.command("profile", ctx => runLookup(ctx, "profile"))
  bot.command("rank", ctx => runLookup(ctx, "rank"))
  bot.command("guild", ctx => runLookup(ctx, "guild"))
  bot.command("ban", ctx => runLookup(ctx, "ban"))

  bot.callbackQuery("ping", async ctx => {
    await ctx.answerCallbackQuery({ text: "pong" })
  })

  bot.on("message:text", ctx => {
    if (ctx.message.text.startsWith("/")) return
    return ctx.reply(ctx.message.text)
  })
}
