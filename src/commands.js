import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {
  const ADMIN_ID = 123456789 // अपनी Telegram ID डालें

  const users = new Set()
  const channels = new Map()

  const mainMenu = new InlineKeyboard()
    .text("🖼️ Image Editor", "editor")
    .row()
    .text("📢 Channels", "channels")
    .row()
    .text("👑 Admin Panel", "admin")

  bot.command("start", async (ctx) => {
    users.add(ctx.from.id)

    await ctx.reply(
      "👑 PREMIUM IMAGE EDITOR\n\n" +
      "🖼️ Edit Your Images\n" +
      "✍️ Add Custom Text\n" +
      "🎨 Customize Designs\n\n" +
      "👇 Select an Option",
      { reply_markup: mainMenu }
    )
  })

  bot.callbackQuery("editor", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("🖼️ अपनी फोटो भेजें।")
  })

  bot.callbackQuery("channels", async (ctx) => {
    await ctx.answerCallbackQuery()

    if (channels.size === 0) {
      return ctx.reply("अभी कोई Channel Add नहीं है।")
    }

    for (const [id, link] of channels) {
      await ctx.reply(`Channel: ${id}\n${link}`)
    }
  })

  bot.callbackQuery("admin", async (ctx) => {
    await ctx.answerCallbackQuery()

    if (ctx.from.id !== ADMIN_ID) {
      return ctx.reply("⛔ Access Denied")
    }

    const keyboard = new InlineKeyboard()
      .text("➕ Add Channel", "add_channel")
      .row()
      .text("➖ Remove Channel", "remove_channel")
      .row()
      .text("📊 Statistics", "stats")

    await ctx.reply("👑 OWNER ADMIN PANEL", {
      reply_markup: keyboard
    })
  })

  bot.callbackQuery("stats", async (ctx) => {
    await ctx.answerCallbackQuery()

    if (ctx.from.id !== ADMIN_ID) return

    await ctx.reply(
      `📊 Total Users: ${users.size}\n📢 Channels: ${channels.size}`
    )
  })

  bot.callbackQuery("add_channel", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (ctx.from.id !== ADMIN_ID) return
    await ctx.reply("Add Channel सिस्टम अगले चरण में जोड़ेंगे।")
  })

  bot.callbackQuery("remove_channel", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (ctx.from.id !== ADMIN_ID) return
    await ctx.reply("Remove Channel सिस्टम अगले चरण में जोड़ेंगे।")
  })

  bot.command("id", (ctx) => {
    ctx.reply(`Your ID: ${ctx.from.id}`)
  })

  bot.command("help", (ctx) => {
    ctx.reply("/start - Main Menu\n/id - Telegram ID")
  })
}
