import { InlineKeyboard } from "grammy";

export function registerCommands(bot) {

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "سلام! ربات مدیریت گروه فعاله. 🤖\nبرای راهنما /help رو بزن."
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "دستورات ربات:\n\n" +
      "/setvip - ثبت VIP\n" +
      "/removevip - حذف VIP\n" +
      "/viplist - لیست VIP ها\n" +
      "/mute - سکوت دائمی\n" +
      "/mute24 - سکوت ۲۴ ساعته\n" +
      "/unmute - رفع سکوت\n" +
      "/setasl - ثبت پرونده\n" +
      "/editasl - ویرایش پرونده\n" +
      "/deleteasl - حذف پرونده\n" +
      "/asl - نمایش پرونده\n" +
      "/setup - تنظیم محدودیت گروه"
    );
  });

  bot.command("ping", (ctx) => ctx.reply("ربات فعاله ✅"));

}
