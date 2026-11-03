import { InlineKeyboard } from "grammy"

const products = [
  ["🥩 Мясо и птица", "meat"],
  ["🐟 Рыба и морепродукты", "fish"],
  ["🥬 Овощи и фрукты", "vegetables"],
  ["🧀 Молочная продукция", "dairy"],
  ["🥫 Бакалея и продукты", "grocery"],
  ["🍽 Оборудование", "equipment"],
]

const services = [
  ["🔧 Ремонт оборудования", "repair"],
  ["🦠 Дезинфекция и дезинсекция", "disinfection"],
  ["🧹 Профессиональный клининг", "cleaning"],
  ["♻️ Приём фритюрного масла", "oil"],
  ["📊 Выездной бухгалтер", "accountant"],
  ["💻 Системы автоматизации", "automation"],
  ["🌐 Специалист по интернету", "internet"],
]

const repairItems = [
  ["🍕 Пицца-печь", "oven"],
  ["❄️ Холодильник", "fridge"],
  ["☕ Кофемашина", "coffee"],
  ["🧊 Льдогенератор", "ice"],
  ["❄️ Холодильный стол", "coldtable"],
]

const automationItems = [
  ["🖥 Моноблок", "monoblock"],
  ["🧾 Принтер чеков", "printer"],
]

function dateToday() {
  return new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Almaty",
  })
}

function mainKeyboard() {
  return new InlineKeyboard()
    .text("📦 Поставщики", "products")
    .row()
    .text("🛠 Услуги", "services")
}

function listKeyboard(items, prefix) {
  const keyboard = new InlineKeyboard()
  for (const [name, id] of items) {
    keyboard.text(name, `${prefix}:${id}`).row()
  }
  keyboard.text("⬅️ Главное меню", "home")
  return keyboard
}

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}\n\nКаталог поставщиков и услуг для ресторанов, кафе и баров Астаны.`,
      { reply_markup: mainKeyboard() },
    )
  })

  bot.command("help", (ctx) =>
    ctx.reply("Используй кнопки меню, чтобы найти поставщиков и услуги."),
  )

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(
      `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}\n\nКаталог поставщиков и услуг для ресторанов, кафе и баров Астаны.`,
      { reply_markup: mainKeyboard() },
    )
  })

  bot.callbackQuery("products", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("📦 ПОСТАВЩИКИ\n\nВыбери категорию:", {
      reply_markup: listKeyboard(products, "product"),
    })
  })

  bot.callbackQuery("services", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("🛠 УСЛУГИ\n\nВыбери направление:", {
      reply_markup: listKeyboard(services, "service"),
    })
  })

  bot.callbackQuery("service:repair", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("🔧 РЕМОНТ ОБОРУДОВАНИЯ\n\nВыбери оборудование:", {
      reply_markup: listKeyboard(repairItems, "item"),
    })
  })

  bot.callbackQuery("service:automation", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("💻 СИСТЕМЫ АВТОМАТИЗАЦИИ\n\nВыбери оборудование:", {
      reply_markup: listKeyboard(automationItems, "item"),
    })
  })

  bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const id = ctx.match[1]
    const category = products.find((item) => item[1] === id)
    await ctx.editMessageText(
      `📦 ${category[0]}\n\nПоставщики этой категории скоро появятся.`,
      { reply_markup: new InlineKeyboard().text("⬅️ Назад", "products").row().text("🏠 Главное меню", "home") },
    )
  })

  bot.callbackQuery(/^service:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const id = ctx.match[1]
    const service = services.find((item) => item[1] === id)
    await ctx.editMessageText(
      `${service[0]}\n\nИсполнители этой категории скоро появятся.`,
      { reply_markup: new InlineKeyboard().text("⬅️ Назад", "services").row().text("🏠 Главное меню", "home") },
    )
  })

  bot.callbackQuery(/^item:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const id = ctx.match[1]
    const item = [...repairItems, ...automationItems].find((entry) => entry[1] === id)
    await ctx.editMessageText(
      `${item[0]}\n\nСпециалисты этой категории скоро появятся.`,
      { reply_markup: new InlineKeyboard().text("⬅️ Назад", "services").row().text("🏠 Главное меню", "home") },
    )
  })
}
