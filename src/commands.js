
import { InlineKeyboard } from "grammy"
import { readFile, writeFile } from "node:fs/promises"

const CHANNEL = "@VEXORAMOVIES"
const INDEX_FILE = "./films-index.json"

let films = []

async function loadFilms() {
  try {
    films = JSON.parse(await readFile(INDEX_FILE, "utf8"))
  } catch {
    films = []
  }
}

async function saveFilms() {
  await writeFile(INDEX_FILE, JSON.stringify(films, null, 2))
}

function normalize(text = "") {
  return text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function registerCommands(bot) {
  loadFilms()

  bot.command("start", (ctx) =>
    ctx.reply(
      `🎬 Ku soo dhawoow American Films!\n\n🔎 Soo qor magaca filimka aad rabto.\n\nTusaale: Avatar, Krish, Extraction.`
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply("🎬 Soo qor magaca filimka aad raadineyso.")
  )

  // Save new channel videos in the search index
  bot.on("channel_post", async (ctx) => {
    const msg = ctx.channelPost
    const isVideo =
      !!msg.video ||
      (msg.document?.mime_type?.startsWith("video/") ?? false)

    if (!isVideo) return

    const title = msg.caption || msg.text || ""

    if (!title.trim()) return

    films = films.filter(f => f.message_id !== msg.message_id)

    films.push({
      message_id: msg.message_id,
      title
    })

    await saveFilms()
    console.log("[films] indexed:", title)
  })

  // Search movies
  bot.on("message:text", async (ctx) => {
    const query = normalize(ctx.message.text)

    if (!query || query.startsWith("/")) return

    const results = films.filter(f =>
      normalize(f.title).includes(query)
    )

    if (results.length === 0) {
      return ctx.reply(
        `❌ Filimka "${ctx.message.text}" lama helin.\n\nHubi magaca ama isku day magac kale.`
      )
    }

    const movie = results[0]

    try {
      await ctx.reply("🔎 Filimka waa la helay, sug...")

      await ctx.api.copyMessage(
        ctx.chat.id,
        CHANNEL,
        movie.message_id
      )
    } catch (error) {
      console.error("[films] send error:", error)
      await ctx.reply("❌ Filimka hadda lama soo diri karin.")
    }
  })
}
