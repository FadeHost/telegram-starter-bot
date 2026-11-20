
import { InlineKeyboard } from "grammy"

const villages = {
  dmytrivka: {
    name: "Дмитрівка",
    queue: "5.2",
  },
  pozharky: {
    name: "Пожарки",
    queue: "1.1",
  },
  rozhyshche: {
    name: "Рожище, вул. Промислова, 89",
    queue: "5.2",
  },
}

const officialUrl =
  "https://energy.volyn.ua/spozhyvacham/perervy-u-elektropostachanni/hrafik-vidkliuchen/pagephp.php"

function mainMenu() {
  return new InlineKeyboard()
    .text("🏡 Дмитрівка", "village:dmytrivka")
    .row()
    .text("🏡 Пожарки", "village:pozharky")
    .row()
    .text("🏠 Рожище, Промислова, 89", "village:rozhyshche")
}

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "⚡ ГРАФІК ВІДКЛЮЧЕНЬ СВІТЛА\n\nОберіть населений пункт:",
      { reply_markup: mainMenu() }
    )
  })

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "⚡ Бот показує чергу відключень для обраного населеного пункту.\n\n/start — головне меню"
    )
  })

  bot.command("ping", (ctx) => ctx.reply("Бот працює ✅"))

  for (const [id, village] of Object.entries(villages)) {
    bot.callbackQuery(`village:${id}`, async (ctx) => {
      await ctx.answerCallbackQuery()

      const keyboard = new InlineKeyboard()
        .url("🌐 Офіційний графік Волиньобленерго", officialUrl)
        .row()
        .text("⬅️ Обрати інший населений пункт", "back")

      await ctx.reply(
        `⚡ ГРАФІК ВІДКЛЮЧЕНЬ\n\n` +
        `📍 ${village.name}\n` +
        `🔢 Ваша черга: ${village.queue}\n\n` +
        "Натисніть кнопку нижче, щоб переглянути актуальний графік.\n\n" +
        "ℹ️ Графік може змінюватися протягом дня.",
        { reply_markup: keyboard }
      )
    })
  }

  bot.callbackQuery("back", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("Оберіть населений пункт:", {
      reply_markup: mainMenu(),
    })
  })

  bot.on("message:text", async (ctx) => {
    if (!ctx.message.text.startsWith("/")) {
      await ctx.reply("Щоб переглянути графік, натисніть /start")
    }
  })
}
