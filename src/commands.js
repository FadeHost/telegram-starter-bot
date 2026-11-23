import { InlineKeyboard } from "grammy";

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply("Привет! Я бот для обработки Load Confirmation. Отправь мне PDF-файл.")
  );

  bot.command("help", (ctx) =>
    ctx.reply("Отправь PDF-файл Load Confirmation, и я попробую обработать его.")
  );

  bot.on("message:document", async (ctx) => {
    const file = ctx.message.document;

    if (file.mime_type !== "application/pdf") {
      return ctx.reply("Пожалуйста, отправляй только PDF-файлы.");
    }

    await ctx.reply("PDF получен! Следующим шагом настроим извлечение информации из него.");
  });
}
