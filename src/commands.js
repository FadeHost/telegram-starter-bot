
import { InlineKeyboard } from "grammy"

const ADMIN_ID = 8481332748
const CHANNEL = "@oss_mahanStreaming"
const APARAT = "https://www.aparat.com/oss_mahan/live"

let isLive = false

const mainMenu = new InlineKeyboard()
  .text("📊 وضعیت استریم", "status")
  .row()
  .url("🔴 ورود به آپارات", APARAT)
  .row()
  .url("📢 کانال استریم", "https://t.me/oss_mahanStreaming")

const adminMenu = new InlineKeyboard()
  .text("🔴 شروع استریم", "admin:start")
  .row()
  .text("⏹ پایان استریم", "admin:end")
  .row()
  .text("📊 وضعیت استریم", "status")
  .row()
  .text("📢 پیام آزمایشی", "admin:test")

export function registerCommands(bot) {

  const isAdmin = (ctx) => ctx.from?.id === ADMIN_ID

  bot.command("start", (ctx) =>
    ctx.reply(
      `🎮 به ربات رسمی OSS_MAHAN خوش آمدید!

🔴 اطلاعیه‌های استریم Iran MTA
📡 پخش زنده در آپارات

از منوی زیر استفاده کنید.`,
      { reply_markup: mainMenu }
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "دستورات ربات:\n/start شروع\n/live وضعیت استریم\n/admin پنل مدیریت"
    )
  )

  bot.command("live", (ctx) =>
    ctx.reply(
      isLive ? "🔴 استریم آنلاین است." : "⚫ استریم فعلاً آفلاین است.",
      { reply_markup: mainMenu }
    )
  )

  bot.command("admin", (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("⛔ شما اجازه دسترسی به پنل مدیریت را ندارید.")
    }

    return ctx.reply("⚙️ پنل مدیریت OSS_MAHAN", {
      reply_markup: adminMenu
    })
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      isLive ? "🔴 استریم آنلاین است." : "⚫ استریم آفلاین است."
    )
  })

  bot.callbackQuery("admin:start", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCallbackQuery({
        text: "⛔ دسترسی غیرمجاز",
        show_alert: true
      })
    }

    if (isLive) {
      return ctx.answerCallbackQuery({
        text: "استریم قبلاً شروع شده است."
      })
    }

    await ctx.answerCallbackQuery()

    try {
      await bot.api.sendMessage(
        CHANNEL,
        `🔴 OSS_MAHAN شروع به استریم کرد!

🎮 بازی: Iran MTA

📡 تماشای پخش زنده:
${APARAT}

منتظرتون هستیم ❤️`
      )

      isLive = true
      await ctx.reply("✅ اطلاعیه شروع استریم منتشر شد.")
    } catch (error) {
      console.error(error)
      await ctx.reply("❌ ارسال پیام ناموفق بود. دسترسی ربات به کانال را بررسی کن.")
    }
  })

  bot.callbackQuery("admin:end", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCallbackQuery({
        text: "⛔ دسترسی غیرمجاز",
        show_alert: true
      })
    }

    if (!isLive) {
      return ctx.answerCallbackQuery({
        text: "استریم در حال حاضر آفلاین است."
      })
    }

    await ctx.answerCallbackQuery()

    try {
      await bot.api.sendMessage(
        CHANNEL,
        `⏹ استریم OSS_MAHAN به پایان رسید.

ممنون از همراهی شما ❤️

برای اطلاع از استریم بعدی عضو کانال باشید:
https://t.me/oss_mahanStreaming`
      )

      isLive = false
      await ctx.reply("✅ اطلاعیه پایان استریم منتشر شد.")
    } catch (error) {
      console.error(error)
      await ctx.reply("❌ ارسال پیام ناموفق بود.")
    }
  })

  bot.callbackQuery("admin:test", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCallbackQuery({
        text: "⛔ دسترسی غیرمجاز",
        show_alert: true
      })
    }

    await ctx.answerCallbackQuery()

    await ctx.reply(
      "✅ پنل مدیریت فعال است.\nاین پیام آزمایشی است و در کانال منتشر نمی‌شود."
    )
  })
}
