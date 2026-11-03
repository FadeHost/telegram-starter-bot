import { InlineKeyboard } from "grammy"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

const ADMIN_ID = 8810466796
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data")
const DATABASE_FILE = path.join(DATA_DIR, "obshepit-astana.json")

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

const meatNames = [
  "Говядина", "Баранина", "Конина", "Верблюжатина",
  "Курица", "Индейка", "Утка", "Гусь", "Казы",
]

const dairyNames = [
  "Молоко", "Творог", "Сметана", "Сливочное масло",
  "Топлёное масло", "Кумыс", "Яйца",
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

const categoryNames = new Map([
  ...products,
  ...services,
])

const userSteps = new Map()

let database = {
  suppliers: [],
}
let databaseLoaded = false

function isAdmin(ctx) {
  return Number(ctx.from?.id) === ADMIN_ID
}

function dateToday() {
  return new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Almaty",
  })
}

async function loadDatabase() {
  await mkdir(DATA_DIR, { recursive: true })

  try {
    const content = await readFile(DATABASE_FILE, "utf8")
    database = JSON.parse(content)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    database = { suppliers: [] }
    await saveDatabase()
  }

  if (!Array.isArray(database.suppliers)) {
    database.suppliers = []
  }
}

async function saveDatabase() {
  await mkdir(DATA_DIR, { recursive: true })

  const temporaryFile = `${DATABASE_FILE}.tmp`
  await writeFile(
    temporaryFile,
    JSON.stringify(database, null, 2),
    "utf8"
  )
  await writeFile(
    DATABASE_FILE,
    await readFile(temporaryFile)
  )
}

function mainKeyboard() {
  return new InlineKeyboard()
    .text("📦 Поставщики", "products")
    .row()
    .text("🛠 Услуги", "services")
}

function backHomeKeyboard() {
  return new InlineKeyboard()
    .text("🏠 Главное меню", "home")
}

function listKeyboard(items, prefix) {
  const keyboard = new InlineKeyboard()

  for (const [name, id] of items) {
    keyboard.text(name, `${prefix}:${id}`).row()
  }

  keyboard.text("⬅️ Главное меню", "home")
  return keyboard
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("➕ Добавить поставщика", "admin:add")
    .row()
    .text("📋 Список поставщиков", "admin:list")
    .row()
    .text("⏳ Продлить размещение", "admin:extend")
    .row()
    .text("✏️ Редактировать поставщика", "admin:edit")
    .row()
    .text("🖼 Фотографии", "admin:photos")
    .row()
    .text("🗑 Удалить поставщика", "admin:delete")
    .row()
    .text("🏠 Главное меню", "home")
}

function categoryTitle(category, itemId) {
  if (category === "meat") {
    const index = Number(itemId.slice(1))
    const name = meatNames[index]
    return itemId.startsWith("h")
      ? `${name} · ХАЛЯЛЬ`
      : name
  }

  if (category === "dairy") {
    const index = Number(itemId.slice(1))
    return dairyNames[index]
  }

  return categoryNames.get(category) || category
}

function supplierCategory(supplier) {
  return supplier.itemId
    ? `${supplier.categoryLabel}`
    : categoryNames.get(supplier.category) || supplier.category
}
function categoryKeyboard(category) {
  const keyboard = new InlineKeyboard()

  if (category === "meat") {
    meatNames.forEach((name, i) => {
      keyboard.text(name, `pick:meat:m${i}`).row()
    })

    meatNames.forEach((name, i) => {
      keyboard.text(`${name} · ХАЛЯЛЬ`, `pick:meat:h${i}`).row()
    })
  }

  if (category === "dairy") {
    keyboard
      .text("🏭 Промышленное хозяйство", "dairytype:industrial")
      .row()
      .text("🚜 Фермерское хозяйство", "dairytype:farm")
  }

  keyboard.text("⬅️ Назад", "products").row()
  keyboard.text("🏠 Главное меню", "home")

  return keyboard
}

async function showCategory(ctx, category, itemId = null) {
  const suppliers = database.suppliers.filter((supplier) => {
    return supplier.category === category &&
      (supplier.itemId || null) === (itemId || null)
  })

  const title = itemId
    ? categoryTitle(category, itemId)
    : categoryNames.get(category) || category

  if (!suppliers.length) {
    await ctx.editMessageText(
      `${title}\n\nПоставщиков пока нет.`,
      {
        reply_markup: itemId
          ? new InlineKeyboard()
              .text("⬅️ Назад", category === "meat" ? "product:meat" : "product:dairy")
              .row()
              .text("🏠 Главное меню", "home")
          : backHomeKeyboard()
      }
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const supplier of suppliers) {
    keyboard
      .text(supplier.name, `supplier:${supplier.id}`)
      .row()
  }

  if (itemId) {
    keyboard
      .text(
        "⬅️ Назад",
        category === "meat" ? "product:meat" : "product:dairy"
      )
      .row()
  } else {
    keyboard.text("⬅️ Назад", "products").row()
  }

  keyboard.text("🏠 Главное меню", "home")

  await ctx.editMessageText(
    `${title}\n\nВыбери поставщика:`,
    { reply_markup: keyboard }
  )
}

async function startAddSupplier(ctx) {
  userSteps.set(ctx.from.id, {
    step: "category",
    values: [],
  })

  const keyboard = new InlineKeyboard()

  products.forEach(([name, id]) => {
    keyboard.text(name, `admin:cat:${id}`).row()
  })

  await ctx.reply("Выбери категорию поставщика:", {
    reply_markup: keyboard,
  })
}

async function finishSupplier(ctx, state) {
  const [name, contact, phone, description, delivery, whatsapp] = state.values

  const supplier = {
    id: crypto.randomUUID(),
    name,
    contact,
    phone,
    description,
    delivery,
    whatsapp,
    photos: state.photos || [],
    category: state.category,
    itemId: state.itemId || null,
    categoryLabel: state.categoryLabel,
    createdAt: new Date().toISOString(),
        durationDays: state.durationDays,
    expiresAt: state.durationDays
      ? new Date(Date.now() + state.durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }

  database.suppliers.push(supplier)
  await saveDatabase()
  userSteps.delete(ctx.from.id)

  await ctx.reply(
    `✅ Поставщик добавлен.\n\n${supplier.name}\nРаздел: ${supplier.categoryLabel}`,
    { reply_markup: adminKeyboard() }
  )
}
export function registerCommands(bot) {
  bot.use(async (ctx, next) => {
    if (!databaseLoaded) {
  await loadDatabase()
  databaseLoaded = true
}
    await next()
  })

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}\n\nКаталог поставщиков и услуг для ресторанов, кафе и баров Астаны.`,
      { reply_markup: mainKeyboard() }
    )
  })

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("⛔️ Доступ запрещён.")
    }

    await ctx.reply("🔐 Панель администратора", {
      reply_markup: adminKeyboard(),
    })
  })

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(
      `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}`,
      { reply_markup: mainKeyboard() }
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

  bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const category = ctx.match[1]

    if (category === "meat") {
      await ctx.editMessageText(
        "🥩 МЯСО И ПТИЦА\n\nФермерское мясо\n\nВыбери продукт:",
        { reply_markup: categoryKeyboard("meat") }
      )
      return
    }

    if (category === "dairy") {
      await ctx.editMessageText(
        "🧀 МОЛОЧНАЯ ПРОДУКЦИЯ\n\nВыбери хозяйство:",
        { reply_markup: categoryKeyboard("dairy") }
      )
      return
    }

    await showCategory(ctx, category)
  })

  bot.callbackQuery(/^dairytype:(industrial|farm)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const type = ctx.match[1]
    const prefix = type === "industrial" ? "p" : "f"
    const keyboard = new InlineKeyboard()

    dairyNames.forEach((name, i) => {
      keyboard.text(name, `pick:dairy:${prefix}${i}`).row()
    })

    keyboard.text("⬅️ Назад", "product:dairy").row()
    keyboard.text("🏠 Главное меню", "home")

    await ctx.editMessageText(
      `${type === "industrial" ? "🏭 Промышленное хозяйство" : "🚜 Фермерское хозяйство"}\n\nВыбери продукт:`,
      { reply_markup: keyboard }
    )
  })

  bot.callbackQuery(/^pick:(meat|dairy):([mhpf]\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    await showCategory(ctx, ctx.match[1], ctx.match[2])
  })

  bot.callbackQuery(/^service:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const id = ctx.match[1]
    let items = []

    if (id === "repair") items = repairItems
    if (id === "automation") items = automationItems

    if (items.length) {
      await ctx.editMessageText(
        `${categoryNames.get(id)}\n\nВыбери оборудование:`,
        { reply_markup: listKeyboard(items, "serviceitem") }
      )
      return
    }

    await ctx.editMessageText(
      `${categoryNames.get(id)}\n\nИнформация скоро появится.`,
      { reply_markup: backHomeKeyboard() }
    )
  })

  bot.callbackQuery(/^serviceitem:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const item = [...repairItems, ...automationItems]
      .find((entry) => entry[1] === ctx.match[1])

    await ctx.editMessageText(
      `${item ? item[0] : "Услуга"}\n\nИнформация скоро появится.`,
      { reply_markup: backHomeKeyboard() }
    )
  })

  bot.callbackQuery(/^supplier:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const supplier = database.suppliers.find(
      (entry) => entry.id === ctx.match[1]
    )

    if (!supplier) {
      await ctx.editMessageText("Поставщик не найден.", {
        reply_markup: backHomeKeyboard(),
      })
      return
    }

    const text = [
      `🏢 ${supplier.name}`,
      "",
      `Раздел: ${supplier.categoryLabel}`,
      `Контактное лицо: ${supplier.contact || "Не указано"}`,
      `Телефон: ${supplier.phone || "Не указан"}`,
      "",
      supplier.description || "",
      "",
      `Доставка: ${supplier.delivery || "Не указано"}`,
      supplier.whatsapp ? `WhatsApp: ${supplier.whatsapp}` : "",
    ].filter(Boolean).join("\n")

    const back = supplier.itemId
      ? `category:${supplier.category}:${supplier.itemId}`
      : `category:${supplier.category}`

    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Назад к списку", back)
        .row()
        .text("🏠 Главное меню", "home"),
    })
  })

  bot.callbackQuery(/^category:([^:]+)(?::([mhpf]\d+))?$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    await showCategory(ctx, ctx.match[1], ctx.match[2] || null)
  })
    bot.callbackQuery("admin:add", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return
    await startAddSupplier(ctx)
  })

  bot.callbackQuery(/^admin:cat:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const category = ctx.match[1]
    const keyboard = new InlineKeyboard()

    if (category === "meat") {
      meatNames.forEach((name, i) => {
        keyboard.text(name, `admin:item:meat:m${i}`).row()
      })

      meatNames.forEach((name, i) => {
        keyboard.text(`${name} · ХАЛЯЛЬ`, `admin:item:meat:h${i}`).row()
      })
    } else if (category === "dairy") {
      keyboard
        .text("🏭 Промышленное хозяйство", "admin:dairy:industrial")
        .row()
        .text("🚜 Фермерское хозяйство", "admin:dairy:farm")
        .row()
    } else {
      keyboard.text("Добавить в общий раздел", `admin:item:${category}:none`).row()
    }

    keyboard.text("❌ Отмена", "admin:cancel")

    await ctx.editMessageText("Выбери подкатегорию:", {
      reply_markup: keyboard,
    })
  })

  bot.callbackQuery(/^admin:dairy:(industrial|farm)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const prefix = ctx.match[1] === "industrial" ? "p" : "f"
    const keyboard = new InlineKeyboard()

    dairyNames.forEach((name, i) => {
      keyboard.text(name, `admin:item:dairy:${prefix}${i}`).row()
    })

    keyboard.text("❌ Отмена", "admin:cancel")

    await ctx.editMessageText("Выбери молочный продукт:", {
      reply_markup: keyboard,
    })
  })

  bot.callbackQuery(/^admin:item:([^:]+):([mhpf]\d+|none)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const category = ctx.match[1]
    const itemId = ctx.match[2]

    const label = itemId === "none"
      ? categoryNames.get(category)
      : categoryTitle(category, itemId)

    userSteps.set(ctx.from.id, {
      step: "supplier",
      category,
      itemId: itemId === "none" ? null : itemId,
      categoryLabel: label,
      values: [],
    })

    await ctx.editMessageText(
      "Введи название компании или поставщика:"
    )
  })

    bot.callbackQuery("admin:extend", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    if (!database.suppliers.length) {
      await ctx.editMessageText("Поставщиков пока нет.")
      return
    }

    const keyboard = new InlineKeyboard()

    for (const supplier of database.suppliers) {
      keyboard.text(supplier.name, `extend:${supplier.id}`).row()
    }

    keyboard.text("⬅️ Назад", "admin:cancel")

    await ctx.editMessageText(
      "Выбери поставщика, которому нужно продлить размещение:",
      { reply_markup: keyboard }
    )
  })
    bot.callbackQuery(/^extend:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const supplier = database.suppliers.find(
      (item) => item.id === ctx.match[1]
    )

    if (!supplier) {
      await ctx.editMessageText("Поставщик не найден.")
      return
    }

    userSteps.set(ctx.from.id, {
      step: "extendDuration",
      supplierId: supplier.id,
    })

    await ctx.editMessageText(
      `Поставщик: ${supplier.name}\n\nНа сколько дней продлить размещение? Введи число от 1 до 3650.`
    )
  })
  bot.callbackQuery("admin:list", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    if (!database.suppliers.length) {
      await ctx.editMessageText("Поставщиков пока нет.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const lines = database.suppliers.map((supplier, i) => {
  if (!supplier.expiresAt) {
    return `${i + 1}. ${supplier.name} — ${supplier.categoryLabel} — без срока`
  }

  const date = new Date(supplier.expiresAt)
  const expired = date.getTime() <= Date.now()
  const dateText = date.toLocaleDateString("ru-RU", {
    timeZone: "Asia/Almaty",
  })

  return `${i + 1}. ${supplier.name} — ${supplier.categoryLabel} — ${expired ? "ИСТЁК" : "до " + dateText}`
})

    await ctx.editMessageText(
      `📋 СПИСОК ПОСТАВЩИКОВ\n\n${lines.join("\n")}`,
      { reply_markup: adminKeyboard() }
    )
  })

  bot.callbackQuery("admin:cancel", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    userSteps.delete(ctx.from.id)

    await ctx.editMessageText("Действие отменено.", {
      reply_markup: adminKeyboard(),
    })
  })

  bot.on("message:text", async (ctx, next) => {
    const state = userSteps.get(ctx.from.id)

    if (!state || !["supplier", "duration", "extendDuration"].includes(state.step)) return next()
    if (!isAdmin(ctx)) return

    const value = ctx.message.text.trim()

    if (value === "/cancel") {
      userSteps.delete(ctx.from.id)
      await ctx.reply("Действие отменено.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    if (!value) {
      await ctx.reply("Поле не должно быть пустым. Введи значение:")
      return
    }

        if (state.step === "extendDuration") {
      const days = Number(value)

      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        await ctx.reply("Введи срок целым числом от 1 до 3650 дней.")
        return
      }

      const supplier = database.suppliers.find(
        (item) => item.id === state.supplierId
      )

      if (!supplier) {
        userSteps.delete(ctx.from.id)
        await ctx.reply("Поставщик не найден.")
        return
      }

      const now = Date.now()
      const currentExpiry = supplier.expiresAt
        ? new Date(supplier.expiresAt).getTime()
        : now

      const baseDate = Math.max(currentExpiry, now)
      supplier.expiresAt = new Date(
        baseDate + days * 24 * 60 * 60 * 1000
      ).toISOString()
      supplier.durationDays = (supplier.durationDays || 0) + days

      await saveDatabase()
      userSteps.delete(ctx.from.id)

      const dateText = new Date(supplier.expiresAt).toLocaleDateString("ru-RU", {
        timeZone: "Asia/Almaty",
      })

      await ctx.reply(
        `✅ Размещение продлено.\n\n${supplier.name}\nНовая дата окончания: ${dateText}`,
        { reply_markup: adminKeyboard() }
      )
      return
    }
    if (state.step === "duration") {
  const days = Number(value)

  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    await ctx.reply("Введи срок целым числом от 1 до 3650 дней. Например: 30.")
    return
  }

  state.durationDays = days
  await finishSupplier(ctx, state)
  return
}
    state.values.push(value)

    const prompts = [
      "Введи контактное лицо:",
      "Введи номер телефона:",
      "Опиши ассортимент или продукцию:",
      "Укажи адрес и условия доставки:",
      "Введи ссылку WhatsApp или напиши «нет»:",
    ]

    if (state.values.length <= prompts.length) {
      await ctx.reply(prompts[state.values.length - 1])
      return
    }

    const whatsapp = value.toLowerCase() === "нет" ? "" : value

    if (
      whatsapp &&
      !/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(whatsapp)
    ) {
      state.values.pop()
      await ctx.reply(
        "Нужна ссылка WhatsApp, начинающаяся с https://wa.me/ или https://api.whatsapp.com/. Либо напиши «нет»."
      )
      return
    }

    state.values[5] = whatsapp
state.step = "duration"
await ctx.reply("Укажи срок размещения в днях. Например, 30 — на месяц.")
return
  })
}
