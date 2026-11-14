
import { InlineKeyboard } from "grammy"

const ADMIN_ID = 8481332748
const CHANNEL = "@oss_mahanStreaming"
const APARAT = "https://www.aparat.com/oss_mahan/live"

let isLive = false
let streamSchedule = "هنوز برنامه‌ای ثبت نشده است."

const mainMenu = new InlineKeyboard()
  .text("📊 وضعیت استریم", "status")
  .row()
  .text("📅 برنامه استریم", "schedule")
  .row()
  .url("🔴 تماشای لایو آپارات", APARAT)
  .row()
  .url("📢 کانال استریم", "https://t.me/oss_mahanStreaming")
  .row()
  .text("🎮 درباره Iran MTA", "iranmta")
  .text("👑 درباره ما", "about")
  .row()
  .text("❓ راهنما", "help")

const adminMenu = new InlineKeyboard()
  .text("🔴 شروع استریم", "admin:start")
  .row()
  .text("⏹ پایان استریم", "admin:end")
  .row()
  .text("📅 برنامه استریم", "admin:schedule")
  .row()
  .text("📊 وضعیت استریم", "status")
  .row()
  .text("📢 پیام آزمایشی", "admin:test")
  .row()
  .text("🔙 منوی اصلی", "home")

export function registerCommands(bot) {

  const isAdmin = (ctx) =>
    ctx.from?.id === ADMIN_ID

  const statusText = () =>
    isLive
      ? "🔴 وضعیت استریم: آنلاین"
      : "⚫ وضعیت استریم: آفلاین"

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🎮 به ربات رسمی OSS_MAHAN خوش آمدید!

🔥 مرجع اطلاع‌رسانی استریم‌های Iran MTA

📡 اخبار و اطلاعیه‌های استریم
🎥 لینک مستقیم پخش زنده
📅 برنامه پخش‌ها

از منوی زیر استفاده کنید:`,
      { reply_markup: mainMenu }
    )
  })

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `❓ راهنمای ربات OSS_MAHAN

/start شروع ربات
/live وضعیت استریم
/schedule برنامه استریم
/aparat لینک آپارات
/id شناسه تلگرام
/admin پنل مدیریت (فقط مدیر)`
    )
  })

  bot.command("live", async (ctx) => {
    await ctx.reply(statusText(), {
      reply_markup: mainMenu
    })
  })

  bot.command("schedule", async (ctx) => {
    await ctx.reply(
      `📅 برنامه استریم OSS_MAHAN

${streamSchedule}`
    )
  })

  bot.command("aparat", async (ctx) => {
    await ctx.reply(
      "🔴 برای تماشای استریم وارد آپارات شوید:",
      {
        reply_markup: new InlineKeyboard().url(
          "تماشای لایو",
          APARAT
        )
      }
    )
  })

  bot.command("id", async (ctx) => {
    await ctx.reply(
      `Chat ID: ${ctx.chat.id}\nYour ID: ${ctx.from?.id}`
    )
  })

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("⛔ دسترسی به پنل مدیریت ندارید.")
    }

    await ctx.reply(
      "👑 پنل مدیریت OSS_MAHAN\n\nعملیات موردنظر را انتخاب کنید:",
      { reply_markup: adminMenu }
    )
  })

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "🎮 منوی اصلی OSS_MAHAN",
      { reply_markup: mainMenu }
    )
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(statusText(), {
      reply_markup: mainMenu
    })
  })

  bot.callbackQuery("schedule", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      `📅 برنامه استریم:

${streamSchedule}`
    )
  })

  bot.callbackQuery("iranmta", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "🎮 Iran MTA\n\nاطلاعیه‌های مربوط به بازی و استریم‌های OSS_MAHAN از همین ربات منتشر می‌شوند."
    )
  })

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "👑 OSS_MAHAN\n\nاستریمر و تولیدکننده محتوای گیمینگ\n\nبازی اصلی: Iran MTA"
    )
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "برای مشاهده وضعیت استریم از دکمه وضعیت استفاده کنید.\nبرای تماشای پخش زنده وارد آپارات شوید."
    )
  })

  bot.callbackQuery(/^admin:/, async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCallbackQuery({
        text: "⛔ دسترسی غیرمجاز",
        show_alert: true
      })
    }

    const action = ctx.callbackQuery.data

    if (action === "admin:start") {

      if (isLive) {
        return ctx.answerCallbackQuery({
          text: "استریم در حال حاضر آنلاین است."
        })
      }

      await ctx.answerCallbackQuery()

      try {
        await bot.api.sendMessage(
          CHANNEL,
          `🔴 OSS_MAHAN لایو شد!

🎮 بازی: Iran MTA

📡 پخش زنده:
${APARAT}

منتظرتون هستیم! ❤️`,
          {
            reply_markup: new InlineKeyboard().url(
              "🔴 ورود به استریم",
              APARAT
            )
          }
        )

        isLive = true

        await ctx.reply(
          "✅ اطلاعیه شروع استریم در کانال منتشر شد."
        )

      } catch (error) {
        console.error("[START ERROR]", error)
        await ctx.reply(
          "❌ ارسال پیام ناموفق بود. دسترسی ربات به کانال را بررسی کن."
        )
      }
    }

    else if (action === "admin:end") {

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

❤️ ممنون از همراهی شما!

برای اطلاع از استریم بعدی عضو کانال باشید:
https://t.me/oss_mahanStreaming`
        )

        isLive = false

        await ctx.reply(
          "✅ اطلاعیه پایان استریم منتشر شد."
        )

      } catch (error) {
        console.error("[END ERROR]", error)
        await ctx.reply(
          "❌ ارسال پیام ناموفق بود."
        )
      }
    }

    else if (action === "admin:schedule") {
      await ctx.answerCallbackQuery()

      await ctx.reply(
        "📅 برای تغییر برنامه فعلاً از بخش ویرایش کد استفاده می‌شود.\n\nبرنامه فعلی:\n" +
        streamSchedule
      )
    }

    else if (action === "admin:test") {
      await ctx.answerCallbackQuery()

      await ctx.reply(
        "✅ پنل مدیریت فعال است.\nپیام آزمایشی با موفقیت اجرا شد."
      )
    }
  })

  console.log("[OSS_MAHAN] Commands registered successfully")
}
