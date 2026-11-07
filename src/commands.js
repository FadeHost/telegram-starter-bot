export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply("ربات انتقال هشتگ فعال است 🤖")
  )

  bot.command("id", (ctx) =>
    ctx.reply(`Chat ID: ${ctx.chat.id}`)
  )

  bot.on("channel_post", async (ctx) => {
    const post = ctx.channelPost
    const content = post.text || post.caption || ""

    if (!/#\p{L}[\p{L}\p{N}_]*/u.test(content)) return

    const target = process.env.TARGET_GROUP_ID

    if (!target) {
      console.error("TARGET_GROUP_ID تنظیم نشده")
      return
    }

    try {
      await ctx.api.forwardMessage(
        target,
        ctx.chat.id,
        post.message_id
      )
      console.log("پیام فوروارد شد")
    } catch (err) {
      console.error("Forward error:", err)
    }
  })
}
