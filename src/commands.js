
import { InlineKeyboard } from "grammy"

const YTDLP_API = process.env.YTDLP_API_URL

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "سلام! 👋\nلینک ویدئوی یوتیوب را بفرست تا اطلاعاتش را بررسی کنم."
    )
  })

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "لینک ویدئوی یوتیوب را ارسال کن.\nمی‌توانی کیفیت ویدئو یا MP3 را انتخاب کنی."
    )
  })

  bot.on("message:text", async (ctx) => {
    const url = ctx.message.text.trim()

    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      return ctx.reply("لطفاً یک لینک معتبر یوتیوب بفرست.")
    }

    if (!YTDLP_API) {
      return ctx.reply(
        "لینک دریافت شد، اما سرویس دانلود هنوز تنظیم نشده است."
      )
    }

    await ctx.reply("در حال بررسی ویدئو...")

    try {
      const response = await fetch(`${YTDLP_API}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      })

      if (!response.ok) throw new Error("Info request failed")

      const video = await response.json()

      const keyboard = new InlineKeyboard()
        .text("360p", `dl:360:${video.id}`).text("480p", `dl:480:${video.id}`)
        .row()
        .text("720p", `dl:720:${video.id}`).text("1080p", `dl:1080:${video.id}`)
        .row()
        .text("🎵 MP3", `mp3:${video.id}`)

      await ctx.reply(
        `🎬 ${video.title}\n\nمدت: ${video.duration ?? "نامشخص"} ثانیه\n\nکیفیت موردنظرت را انتخاب کن:`,
        { reply_markup: keyboard }
      )
    } catch (error) {
      console.error(error)
      await ctx.reply("در دریافت اطلاعات ویدئو مشکلی پیش آمد.")
    }
  })

  bot.on("callback_query:data", async (ctx) => {
    const [type, quality, id] = ctx.callbackQuery.data.split(":")
    await ctx.answerCallbackQuery()

    if (!YTDLP_API) {
      return ctx.reply("سرویس دانلود هنوز تنظیم نشده است.")
    }

    await ctx.reply("درخواست دانلود ثبت شد. لطفاً صبر کن...")

    try {
      const response = await fetch(`${YTDLP_API}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          type,
          quality: type === "dl" ? quality : "mp3",
          chat_id: ctx.chat.id
        })
      })

      if (!response.ok) throw new Error("Download request failed")

      await ctx.reply("درخواست به سرویس دانلود ارسال شد.")
    } catch (error) {
      console.error(error)
      await ctx.reply("دانلود انجام نشد. سرویس دانلود در دسترس نیست.")
    }
  })
}
