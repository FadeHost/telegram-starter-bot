
import { InlineKeyboard } from "grammy"

const CHANNEL = "@VEXORAMOVIES"
const films = new Map()

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🎬 Ku soo dhowow AMERICAN FILMS!\n\nQor magaca filimka aad raadineyso.",
      {
        reply_markup: new InlineKeyboard().text("🔎 Raadi Filim", "search")
      }
    )
  })

  bot.command("help", (ctx) =>
    ctx.reply(
      "🎥 Sida loo isticmaalo:\n\n" +
      "1. Qor magaca filimka.\n" +
      "2. Bot-ku wuxuu ka raadinayaa channel-ka.\n" +
      "3. Haddii la helo, filimka ayuu kuu soo dirayaa."
    )
  )

  bot.command("ping", (ctx) => ctx.reply("Bot-ku waa shaqeynayaa ✅"))

  bot.command("id", (ctx) =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from?.id}`)
  )

  bot.on("channel_post", (ctx) => {
    const msg = ctx.channelPost
    const title = (msg.caption || msg.text || "").trim()

    const hasMedia =
      msg.video || msg.document || msg.photo ||
      msg.audio || msg.animation

    if (hasMedia && title) {
      films.set(msg.message_id, {
        title: title.toLowerCase(),
        messageId: msg.message_id
      })
    }
  })

  bot.on("message:text", async (ctx) => {
    const query = ctx.message.text.trim().toLowerCase()
    if (!query || query.startsWith("/")) return

    const matches = [...films.values()].filter((film) =>
      film.title.includes(query)
    )

    if (!matches.length) {
      return ctx.reply("😔 Filimkaas lama helin. Isku day magac kale.")
    }

    await ctx.reply(`🎬 Waxaan helay ${matches.length} natiijo.`)

    for (const film of matches.slice(0, 5)) {
      try {
        await ctx.api.copyMessage(ctx.chat.id, CHANNEL, film.messageId)
      } catch (error) {
        await ctx.reply("❌ Filimka lama soo diri karin.")
      }
    }
  })

  bot.callbackQuery("search", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("🔎 Hadda qor magaca filimka aad rabto.")
  })
}
