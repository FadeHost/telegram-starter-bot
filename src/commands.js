
import { InlineKeyboard } from "grammy"

const CHANNEL = "@VEXORAMOVIES"
const films = []

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply(
      "🎬 Ku soo dhowow VEXORA CINEMA!\n\nQor magaca filimka aad raadineyso."
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply("🎥 Qor magaca filimka si aan kuugu raadiyo.")
  )

  bot.command("ping", (ctx) => ctx.reply("Bot-ku waa shaqeynayaa ✅"))

  // Kaydi filimada cusub ee channel-ka lagu soo geliyo
  bot.on("channel_post", (ctx) => {
    const msg = ctx.channelPost
    const title = msg.caption || msg.text || ""

    const hasMedia =
      msg.video || msg.document || msg.photo ||
      msg.audio || msg.animation

    if (hasMedia && title.trim()) {
      films.push({
        title: title.toLowerCase(),
        messageId: msg.message_id,
      })
    }
  })

  // Raadi filimka uu qofku qoray
  bot.on("message:text", async (ctx) => {
    const query = ctx.message.text.trim().toLowerCase()

    if (query.startsWith("/")) return

    const matches = films.filter((film) =>
      film.title.includes(query)
    )

    if (matches.length === 0) {
      return ctx.reply(
        "😔 Filimkaas ma helin. Hubi magaca ama mar kale isku day."
      )
    }

    await ctx.reply(`🎬 Waxaan helay ${matches.length} natiijo.`)

    for (const film of matches.slice(0, 5)) {
      try {
        await ctx.api.copyMessage(
          ctx.chat.id,
          CHANNEL,
          film.messageId
        )
      } catch {
        await ctx.reply("Filimkan hadda lama soo diri karin.")
      }
    }
  })
}
