import { InlineKeyboard } from "grammy"

const replies = {
  hello: [
    "سلاممم! 😎 چه خبر از بچه‌ها؟",
    "به‌به! سلام به روی ماهت 😂💎",
    "سلام رفیق! چه عجب پیدات شد!",
    "درود بر اعضای گل این گروه! 🤖"
  ],

  how: [
    "من که عالی‌ام، تو چطوری؟ 😁",
    "فعلاً که همه‌چی روبه‌راهه 😂",
    "خوبم، بهتر از همیشه! تو خوبی؟"
  ],

  morning: [
    "صبح همگی بخیر! ☀️",
    "صبح قشنگتون بخیر رفقا 💎"
  ],

  night: [
    "شب همگی بخیر! 🌙",
    "شبتون آروم و پر از اتفاقای خوب ❤️"
  ],

  thanks: [
    "قابلی نداشت! 😎",
    "انجام وظیفه بود 😂",
    "خواهش می‌کنم رفیق 💎"
  ]
}

function randomReply(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function registerCommands(bot) {

  bot.command("start", (ctx) =>
    ctx.reply(
      "سلام! من ZINO هستم 🤖💎\nبرای آشنایی بیشتر /help رو بزن."
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "دستورهای من:\n/start شروع\n/help راهنما\n/ping تست ربات\n/id شناسه‌ها"
    )
  )

  bot.command("ping", (ctx) => ctx.reply("Pong! 🤖💎"))

  bot.command("id", (ctx) =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from?.id ?? "unknown"}`)
  )

  bot.callbackQuery("ping", (ctx) =>
    ctx.answerCallbackQuery({ text: "من بیدارم! 😎" })
  )

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim().toLowerCase()

    if (/^(سلام|سلامم|درود|hi|hello|hey)[!؟?. ]*$/i.test(text)) {
      return ctx.reply(randomReply(replies.hello))
    }

    if (/^(خوبی|چطوری|حالت چطوره|چه خبر)[!؟?. ]*$/i.test(text)) {
      return ctx.reply(randomReply(replies.how))
    }

    if (/^(صبح بخیر|صبحت بخیر)[!؟?. ]*$/i.test(text)) {
      return ctx.reply(randomReply(replies.morning))
    }

    if (/^(شب بخیر|شبت بخیر)[!؟?. ]*$/i.test(text)) {
      return ctx.reply(randomReply(replies.night))
    }

    if (/^(ممنون|مرسی|متشکرم|دمت گرم)[!؟?. ]*$/i.test(text)) {
      return ctx.reply(randomReply(replies.thanks))
    }

    if (/^zino[!؟?. ]*$/i.test(text)) {
      return ctx.reply("جانم؟ 😎 کاری داشتی؟")
    }
  })
              }
