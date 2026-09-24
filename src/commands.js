// Your bot's behaviour. Add commands here; grammY's docs (grammy.dev) cover
// keyboards, sessions, files, inline queries and everything else.

import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply(`Hi ${ctx.from?.first_name ?? "there"}. I am alive and hosted on FadeHost. Send /help to see what I can do.`, {
      reply_markup: new InlineKeyboard().text("Ping me", "ping"),
    }),
  )

  bot.command("help", (ctx) =>
    ctx.reply(["Commands:", "/start  say hello", "/help   this list", "/ping   check I am awake", "/id     show chat and user ids", "", "Send me any text and I echo it back."].join("\n")),
  )

  bot.command("ping", (ctx) => ctx.reply("pong"))

  bot.command("id", (ctx) => ctx.reply(`Chat id: ${ctx.chat.id}\nYour id: ${ctx.from?.id ?? "unknown"}`))

  bot.callbackQuery("ping", (ctx) => ctx.answerCallbackQuery({ text: "pong" }))

  bot.on("message:text", (ctx) => ctx.reply(ctx.message.text))
}
