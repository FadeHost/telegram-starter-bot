
import { InlineKeyboard } from "grammy"
import { readFile, writeFile } from "node:fs/promises"

const ADMIN_ID = 1338635280
const FILE = "./iphone-sniper-data.json"

const models = [
  "iPhone 12",
  "iPhone 13",
  "iPhone 14",
  "iPhone 15",
  "iPhone 16",
  "iPhone 17",
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
]

let prices = {}
let searchActive = false
const waitingForPrice = new Map()

async function loadPrices() {
  try {
    prices = JSON.parse(await readFile(FILE, "utf8"))
  } catch {
    prices = {}
  }
}

async function savePrices() {
  await writeFile(FILE, JSON.stringify(prices, null, 2))
}

function menu() {
  return new InlineKeyboard()
    .text("🔎 Начать поиск", "search:start")
    .text("⏹ Стоп", "search:stop")
    .row()
    .text("💰 Настроить цены", "prices")
    .row()
    .text("📊 Мои настройки", "status")
}

function priceMenu() {
  const keyboard = new InlineKeyboard()
  models.forEach((model, i) => {
    keyboard.text(model, `price:${i}`).row()
  })
  keyboard.text("⬅️ Назад", "menu")
  return keyboard
}

export function registerCommands(bot) {
  loadPrices()

  bot.use(async (ctx, next) => {
    if (ctx.from?.id !== ADMIN_ID) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: "Нет доступа" })
      } else if (ctx.message) {
        await ctx.reply("У вас нет доступа к этому боту.")
      }
      return
    }
    await next()
  })

  bot.command("start", (ctx) =>
    ctx.reply(
      "🎯 iPhone Sniper\n\nУправление поиском объявлений Avito.",
      { reply_markup: menu() }
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply("Используй кнопки меню для управления iPhone Sniper.")
  )

  bot.callbackQuery("menu", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("🎯 iPhone Sniper\n\nГлавное меню:", {
      reply_markup: menu(),
    })
  })

  bot.callbackQuery("prices", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("💰 Выбери модель для изменения цены:", {
      reply_markup: priceMenu(),
    })
  })

  bot.callbackQuery(/^price:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const index = Number(ctx.match[1])
    const model = models[index]
    if (!model) return

    waitingForPrice.set(ctx.from.id, model)

    await ctx.reply(
      `💰 ${model}\nТекущая максимальная цена: ${prices[model] ? prices[model] + " ₽" : "не установлена"}\n\nОтправь новую максимальную цену в рублях. Например: 15000`
    )
  })

  bot.on("message:text", async (ctx) => {
    const model = waitingForPrice.get(ctx.from.id)
    if (!model) {
      await ctx.reply("Выбери действие в меню:", {
        reply_markup: menu(),
      })
      return
    }

    const value = Number(ctx.message.text.replace(/\s/g, "").replace(",", "."))

    if (!Number.isInteger(value) || value < 1000 || value > 1000000) {
      await ctx.reply("Введи целую сумму в рублях, например 15000.")
      return
    }

    prices[model] = value
    waitingForPrice.delete(ctx.from.id)
    await savePrices()

    await ctx.reply(
      `✅ Цена сохранена!\n${model}: до ${value.toLocaleString("ru-RU")} ₽`,
      { reply_markup: menu() }
    )
  })

  bot.callbackQuery("search:start", async (ctx) => {
    searchActive = true
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "🔎 Режим поиска включён.\n\nПока подключается интерфейс управления. Источник объявлений Avito ещё не подключён, поэтому реальные объявления пока не проверяются.",
      { reply_markup: menu() }
    )
  })

  bot.callbackQuery("search:stop", async (ctx) => {
    searchActive = false
    await ctx.answerCallbackQuery()
    await ctx.reply("⏹ Режим поиска остановлен.", {
      reply_markup: menu(),
    })
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()

    const priceText = models
      .map((model) => `${model}: ${prices[model] ? prices[model] + " ₽" : "не задана"}`)
      .join("\n")

    await ctx.reply(
      `📊 iPhone Sniper\n\nПоиск: ${searchActive ? "включён" : "остановлен"}\nРегион: Москва\nПродавцы: частные\nАКБ: от 75%\nИнтервал: 1 минута\n\n💰 Максимальные цены:\n${priceText}`,
      { reply_markup: menu() }
    )
  })
}
