
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

const meatFarm = [
  ["Говядина", "meat_farm_beef"],
  ["Баранина", "meat_farm_lamb"],
  ["Конина", "meat_farm_horse"],
  ["Верблюжатина", "meat_farm_camel"],
  ["Курица", "meat_farm_chicken"],
  ["Индейка", "meat_farm_turkey"],
  ["Утка", "meat_farm_duck"],
  ["Гусь", "meat_farm_goose"],
  ["Казы", "meat_farm_kazy"],
]

const meatHalal = [
  ["Говядина", "meat_halal_beef"],
  ["Баранина", "meat_halal_lamb"],
  ["Верблюжатина", "meat_halal_camel"],
  ["Конина", "meat_halal_horse"],
  ["Курица", "meat_halal_chicken"],
  ["Индейка", "meat_halal_turkey"],
  ["Утка", "meat_halal_duck"],
  ["Гусь", "meat_halal_goose"],
  ["Казы", "meat_halal_kazy"],
]

const dairyIndustrial = [
  ["Молоко", "dairy_industrial_milk"],
  ["Творог", "dairy_industrial_cottage"],
  ["Сметана", "dairy_industrial_sourcream"],
  ["Сливочное масло", "dairy_industrial_butter"],
  ["Топлёное масло", "dairy_industrial_ghee"],
  ["Кумыс", "dairy_industrial_kumys"],
  ["Яйца", "dairy_industrial_eggs"],
]

const dairyFarm = [
  ["Молоко", "dairy_farm_milk"],
  ["Творог", "dairy_farm_cottage"],
  ["Сметана", "dairy_farm_sourcream"],
  ["Сливочное масло", "dairy_farm_butter"],
  ["Топлёное масло", "dairy_farm_ghee"],
  ["Кумыс", "dairy_farm_kumys"],
  ["Яйца", "dairy_farm_eggs"],
]

const catalogGroups = {
  meat_farm: {
    title: "Фермерское мясо",
    heading: "🥩 МЯСО И ПТИЦА",
    items: meatFarm,
  },
  meat_halal: {
    title: "Фермерское мясо Халяль",
    heading: "🥩 МЯСО И ПТИЦА",
    items: meatHalal,
  },
  dairy_industrial: {
    title: "Промышленное хозяйство",
    heading: "🧀 МОЛОЧНАЯ ПРОДУКЦИЯ",
    items: dairyIndustrial,
  },
  dairy_farm: {
    title: "Фермерское хозяйство",
    heading: "🧀 МОЛОЧНАЯ ПРОДУКЦИЯ",
    items: dairyFarm,
  },
}

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

function groupKeyboard(groupId) {
  const group = catalogGroups[groupId]
  const keyboard = new InlineKeyboard()

  for (const [name, id] of group.items) {
    keyboard.text(name, `catalog:${groupId}:${id}`).row()
  }

  keyboard
    .text("⬅️ Назад к поставщикам", "products")
    .row()
    .text("🏠 Главное меню", "home")

  return keyboard
}

async function showGroup(ctx, groupId) {
  const group = catalogGroups[groupId]

  await ctx.editMessageText(
    `${group.heading}\n\n${group.title}\n\nВыбери вид продукции:`,
    { reply_markup: groupKeyboard(groupId) },
  )
}

async function showMeat(ctx) {
  await ctx.answerCallbackQuery()

  await showGroup(ctx, "meat_farm")

  await ctx.reply(
    "🥩 МЯСО И ПТИЦА\n\nФермерское мясо Халяль\n\nВыбери вид продукции:",
    { reply_markup: groupKeyboard("meat_halal") },
  )
}

async function showDairy(ctx) {
  await ctx.answerCallbackQuery()

  await showGroup(ctx, "dairy_industrial")

  await ctx.reply(
    "🧀 МОЛОЧНАЯ ПРОДУКЦИЯ\n\nФермерское хозяйство\n\nВыбери вид продукции:",
    { reply_markup: groupKeyboard("dairy_farm") },
  )
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

  bot.callbackQuery("product:meat", showMeat)

  bot.callbackQuery("product:dairy", showDairy)

  bot.callbackQuery(/^catalog:([^:]+):(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const groupId = ctx.match[1]
    const itemId = ctx.match[2]
    const group = catalogGroups[groupId]

    if (!group) return

    const item = group.items.find((entry) => entry[1] === itemId)

    if (!item) return

    await ctx.editMessageText(
      `${item[0]}\n\nПоставщики этой категории скоро появятся.`,
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Назад", `group:${groupId}`)
          .row()
          .text("🏠 Главное меню", "home"),
      },
    )
  })

  bot.callbackQuery(/^group:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const groupId = ctx.match[1]

    if (!catalogGroups[groupId]) return

    await showGroup(ctx, groupId)
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

    if (!category) return

    await ctx.editMessageText(
      `📦 ${category[0]}\n\nПоставщики этой категории скоро появятся.`,
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Назад", "products")
          .row()
          .text("🏠 Главное меню", "home"),
      },
    )
  })

  bot.callbackQuery(/^service:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const id = ctx.match[1]
    const service = services.find((item) => item[1] === id)

    if (!service) return

    await ctx.editMessageText(
      `${service[0]}\n\nИсполнители этой категории скоро появятся.`,
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Назад", "services")
          .row()
          .text("🏠 Главное меню", "home"),
      },
    )
  })

  bot.callbackQuery(/^item:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const id = ctx.match[1]
    const item = [...repairItems, ...automationItems].find(
      (entry) => entry[1] === id,
    )

    if (!item) return

    await ctx.editMessageText(
      `${item[0]}\n\nСпециалисты этой категории скоро появятся.`,
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Назад", "services")
          .row()
          .text("🏠 Главное меню", "home"),
      },
    )
  })
}
