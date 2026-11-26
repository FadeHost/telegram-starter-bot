export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply("🛡 APK Delete Bot is active!")
  )

  bot.command("help", (ctx) =>
    ctx.reply("I automatically delete APK files from this group.")
  )

  const blockedExtensions = [
    ".apk",
    ".xapk",
    ".apks",
    ".aab"
  ]

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
