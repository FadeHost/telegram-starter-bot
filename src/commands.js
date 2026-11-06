import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {

  // التأكد أن البوت داخل مجموعة
  const isGroup = (ctx) =>
    ctx.chat.type === "group" || ctx.chat.type === "supergroup"

  // الترحيب بالأعضاء الجدد
  bot.on("message:new_chat_members", async (ctx) => {
    if (!isGroup(ctx)) return

    for (const user of ctx.message.new_chat_members) {
      await ctx.reply(
        `╭────── 💗 ──────╮

أهلاً وسهلاً بك ${user.first_name}

نورت مجموعتنا مع نالي 🌸

نتمنى لك وقتاً ممتعاً

╰────── 💗 ──────╯`
      )
    }
  })

  // أمر المساعدة
  bot.command("start", (ctx) => {
    if (!isGroup(ctx)) return
    return ctx.reply("أهلاً بك في NALI BOT 💗\nاكتب /help لمعرفة الأوامر")
  })

  bot.command("help", (ctx) => {
    if (!isGroup(ctx)) return

    return ctx.reply(
      `💗 أوامر نالي

/start - تشغيل البوت
/help - المساعدة
/ping - فحص البوت
/id - عرض الآيدي
/rank - معرفة رتبتك

NALI BOT`
    )
  })

  // فحص البوت
  bot.command("ping", (ctx) => {
    if (!isGroup(ctx)) return
    return ctx.reply("NALI ONLINE 💗")
  })

  // الآيدي
  bot.command("id", (ctx) => {
    if (!isGroup(ctx)) return
    return ctx.reply(
      `Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from.id}`
    )
  })

  // معرفة الرتبة
  bot.command("rank", async (ctx) => {
    if (!isGroup(ctx)) return

    const member = await ctx.getChatMember(ctx.from.id)

    let rank = "👤 عضو"

    if (member.status === "creator") rank = "👑 مالك المجموعة"
    else if (member.status === "administrator") rank = "🛡️ مشرف"

    return ctx.reply(`رتبتك في المجموعة:\n${rank}`)
  })

  // الردود التلقائية
  bot.on("message:text", async (ctx) => {
    if (!isGroup(ctx)) return

    const text = ctx.message.text.toLowerCase()

    if (text === "نالي") {
      return ctx.reply("عيوني يا قلبي 💗")
    }

    if (text === "مرحبا" || text === "هلا") {
      return ctx.reply("يا هلا وغلا 🌸")
    }

    if (text === "صباح الخير") {
      return ctx.reply("صباح النور والسرور 💗")
    }

    if (text === "مساء الخير") {
      return ctx.reply("مساء الورد 🌹")
    }

    if (text === "كيفك") {
      return ctx.reply("بخير دامك بخير يا قلبي 💗")
    }

    if (text === "احبك" || text === "أحبك") {
      return ctx.reply("وأنا أحب وجودك 💗")
    }
  })

  // زر Ping
  bot.callbackQuery("ping", (ctx) =>
    ctx.answerCallbackQuery({ text: "NALI ONLINE 💗" })
  )
}
