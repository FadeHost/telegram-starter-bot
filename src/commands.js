
import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {

  const menu = new InlineKeyboard()
    .text("📝 إنشاء حساب", "register").row()
    .text("💰 شحن الحساب", "deposit").row()
    .text("💸 سحب الرصيد", "withdraw").row()
    .text("👤 رصيدي", "balance").row()
    .text("🎮 الألعاب", "games").row()
    .text("🌐 موقع الألعاب", "website")

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🦁 أهلاً بك في LION GAMES\n\nمرحباً بك في عالم الألعاب!",
      { reply_markup: menu }
    )
  })

  bot.command("help", (ctx) =>
    ctx.reply("🦁 LION GAMES\nاستخدم أزرار القائمة الرئيسية للتنقل.")
  )

  bot.callbackQuery("register", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("📝 لإنشاء حساب، أرسل اسم المستخدم الذي تريده.")
  })

  bot.callbackQuery("deposit", async (ctx) => {
    await ctx.answerCallbackQuery()
    const keyboard = new InlineKeyboard()
      .text("شام كاش", "sham")
      .row()
      .text("سيريتل كاش", "syriatel")
      .row()
      .text("USDT", "usdt")
    await ctx.reply("💰 اختر طريقة الشحن:", {
      reply_markup: keyboard
    })
  })

  bot.callbackQuery("withdraw", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("💸 طلب السحب: يرجى التواصل مع الإدارة.")
  })

  bot.callbackQuery("balance", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("👤 رصيدك الحالي: 0")
  })

  bot.callbackQuery("games", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("🎮 الألعاب المتاحة:\n\n🎰 Slots\n🎲 Roulette\n💣 Mines\n🚀 Crash")
  })

  bot.callbackQuery("website", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("🌐 https://eaglebet99.com/")
  })

  bot.callbackQuery(["sham", "syriatel", "usdt"], async (ctx) => {
    await ctx.answerCallbackQuery()
    const methods = {
      sham: "شام كاش",
      syriatel: "سيريتل كاش",
      usdt: "USDT (BEP20)"
    }
    await ctx.reply(`💰 اخترت ${methods[ctx.callbackQuery.data]}\n\nسيتم تجهيز تفاصيل الدفع في الخطوة التالية.`)
  })

  bot.callbackQuery("ping", (ctx) =>
    ctx.answerCallbackQuery({ text: "البوت يعمل 🦁" })
  )
}
