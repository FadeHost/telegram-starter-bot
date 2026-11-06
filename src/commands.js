export function registerCommands(bot) {

  const GROUP_ID = -1003318605733
  const THREAD_ID = 64

  bot.command("start", (ctx) =>
    ctx.reply("⚔️ Бот Гонки вооружений запущен!")
  )

  bot.command("testtopic", async (ctx) => {
    try {
      await bot.api.sendMessage(
        GROUP_ID,
        "⚔️ ГОНКА ВООРУЖЕНИЙ\n\n✅ Проверка связи! Бот успешно публикует сообщения.",
        { message_thread_id: THREAD_ID }
      )

      await ctx.reply("✅ Команда выполнена! Проверь тему FANGroup.")
    } catch (error) {
      await ctx.reply("❌ Ошибка:\n" + error.message)
    }
  })

  bot.command("help", (ctx) =>
    ctx.reply("/start — запуск\n/testtopic — проверка публикации")
  )

}
