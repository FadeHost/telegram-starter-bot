
import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {
  const menu = new InlineKeyboard()
    .text("👤 إنشاء حساب", "register").row()
    .text("💰 شحن الحساب", "deposit").row()
    .text("💸 سحب الرصيد", "withdraw").row()
    .text("💳 رصيدي", "balance").row()
    .text("🎮 الألعاب", "games")

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🦁 أهلاً بك في LION GAMES\n\nمنصة الألعاب والترفيه\n\nاختر من القائمة:",
      { reply_markup: menu }
    )
  })

  bot.command("help", (ctx) =>
    ctx.reply("🦁 LION GAMES\n/start - القائمة الرئيسية")
  )

  bot.callbackQuery("register", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("👤 لإنشاء حساب، أرسل اسم المستخدم الذي تريده.")
  })

  bot.callbackQuery("deposit", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("💰 اختر طريقة الشحن:\n\nشام كاش\nسيرياتيل كاش\nUSDT\n\nيرجى التواصل مع الإدارة لإتمام الشحن.")
  })

  bot.callbackQuery("withdraw", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("💸 لطلب سحب الرصيد، يرجى التواصل مع الإدارة.")
  })

  bot.callbackQuery("balance", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("💳 نظام الرصيد قيد التجهيز.")
  })

  bot.callbackQuery("games", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("🎮 الألعاب:\n🎰 Slots\n🎲 Roulette\n💣 Mines\n🚀 Crash")
  })
}
