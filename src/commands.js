import { InlineKeyboard } from "grammy";

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply(
`سلام خانواده هانی ❤️ / Hello HANI Family ❤️

🇮🇷 فارسی:
ما تازه شروع کردیم، و این بهترین فرصت است.
چرا الان بهترین وقت است؟

✅ قیمت در کف است
✅ همین حالا معامله زنده است - همین الان میتوانی بخری و بفروشی
✅ در کیف پول فانتوم، تراست ولت و ژوپیتر موجود است
✅ نقدینگی قفل شده - کوین قابل اعتماد
✅ آینده روشن - ما با هم داریم میسازیمش

تو میتوانی با پول کم شروع کنی، به پول زیاد نیاز نداری. مهم این است که زود بیایی و نگه داری.
کسی که زود بیاید و نگه دارد، همیشه برنده است. کسی که دیر بیاید، فقط پشیمان میشود.
ما فروشنده نیستیم، ما سازنده هستیم
هانی را نگه دار، آینده از آن ماست. 🍯🚀


🇺🇸 English:
We just started, and this is the best opportunity.
Why is now the best time?

✅ Price is at the bottom
✅ Live trading right now - you can buy and sell now
✅ Available on Phantom, Trust Wallet and Jupiter
✅ Liquidity locked - trusted coin
✅ Bright future - we are building it together

You can start with little money, you don't need a lot. The important thing is to come early and hold.
Who comes early and holds, always wins. Who comes late, only regrets.
We are not sellers, we are builders.
Hold HANI, the future is ours. 🍯🚀`,
      {
        reply_markup: new InlineKeyboard()
          .text("🛒 Buy HANI / خرید", "buy")
          .text("📈 Chart / چارت", "chart")
          .row()
          .text("💬 Group / گروه", "group")
          .text("❓ Help / راهنما", "help_btn"),
      }
    )
  );

  bot.command("help", (ctx) =>
    ctx.reply(`دستورات / Commands:
 /start - پیام اصلی / Main message
 /buy
