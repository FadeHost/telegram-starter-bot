
import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply("🛡 APK Delete Bot ishga tushdi!")
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "Buyruqlar:\n/start - Botni ishga tushirish\n/help - Yordam\n/ping - Bot holatini tekshirish\n/id - Chat ID\n\nAPK fayllar avtomatik o'chiriladi."
    )
  )

  bot.command("ping", (ctx) => ctx.reply("pong"))

  bot.command("id", (ctx) =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from?.id ?? "unknown"}`)
  )

  bot.callbackQuery("ping", (ctx) =>
    ctx.answerCallbackQuery({ text: "pong" })
  )

  const blockedExtensions = [".apk", ".xapk", ".apks", ".aab"]

  bot.on("message:document", async (ctx) => {
    const file = ctx.message.document
    const filename = (file.file_name || "").toLowerCase()

    if (blockedExtensions.some(ext => filename.endsWith(ext))) {
      try {
        await ctx.deleteMessage()
        console.log(`[DELETED] ${filename}`)
      } catch (error) {
        console.error("[DELETE ERROR]", error)
      }
    }
  })
}
