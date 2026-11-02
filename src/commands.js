export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply(`Привет, ${ctx.from?.first_name ?? "друг"}! Я работаю.`)
  );

  // Свои команды добавляй сюда
}
