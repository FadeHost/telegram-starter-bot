import { InlineKeyboard } from "grammy"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

const ADMIN_ID = 8810466796
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data")
const DATABASE_FILE = path.join(DATA_DIR, "obshepit-astana.json")

const products = [
  ["🥩 Мясо и птица Халяль", "meat_halal"],
  ["🥩 Мясо и птица Фермер", "meat_farm"],
  ["🐟 Рыба и морепродукты", "fish"],
  ["🥬 Овощи и фрукты", "vegetables"],
  ["🧀 Молочная продукция", "dairy"],
  ["🥫 Бакалея и продукты", "grocery"],
  ["❄️ Замороженная продукция", "equipment"],
  ["☕ Кофе и барная продукция", "bar"],
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
const halalMeatNames = [
  "Говядина Халяль",
  "Баранина Халяль",
  "Конина Халяль",
  "Верблюжатина Халяль",
  "Курица Халяль",
  "Индейка Халяль",
  "Утка Халяль",
  "Гусь Халяль",
  "Казы Халяль",
]

const dairyNames = [
  "Молоко", "Творог", "Сметана", "Сливочное масло",
  "Топлёное масло", "Кумыс", "Яйца",
]

const fishNames = [
  "Сёмга охлаждённая",
  "Форель морская свежемороженая",
  "Угорь копчёный",
  "Сельдь",
  "Скумбрия",
  "Горбуша",
  "Минтай",
  "Форель",
  "Треска",
  "Хек",
  "Тунец",
  "Камбала",
  "Форель охлаждённая",
  "Сельдь слабосолёная",
  "Осетрина копчёная",
  "Скумбрия копчёная",
  "Икра красная лососёвая",
  "Икра чёрная осетровая",
  "Икра чёрная гибридная",
  "Осьминог",
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
const lastSupplierCards = new Map()
const lastMainMenus = new Map()
const lastSupplierLists = new Map()

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

    if (!Array.isArray(database.autoposts)) {
    database.autoposts = database.autopost ? [database.autopost] : []
  }

  if (!Array.isArray(database.autopostGroups)) {
    database.autopostGroups = []
  }

  delete database.autopost
  await saveDatabase()
}

let saveQueue = Promise.resolve()

async function saveDatabase() {
  const operation = saveQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true })

    const temporaryFile = `${DATABASE_FILE}.${process.pid}.tmp`
    await writeFile(
      temporaryFile,
      JSON.stringify(database, null, 2),
      "utf8"
    )
    await rename(temporaryFile, DATABASE_FILE)
  })

  saveQueue = operation.catch(() => {})
  return operation
}

let autopostTimer = null
let autopostBusy = false

function startAutopostScheduler(bot) {
  let running = false

  setInterval(async () => {
    if (running) return
    running = true

    try {
            const jobs = database.autoposts || []
      const now = new Date()

      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Almaty",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(now)

      const get = (type) => parts.find((p) => p.type === type).value

      const today = `${get("year")}-${get("month")}-${get("day")}`
      const currentTime = `${get("hour")}:${get("minute")}`

      for (const job of jobs) {
        if (!job || !job.active) continue

        if (now >= new Date(job.expiresAt)) {
          job.active = false
          await saveDatabase()
          continue
        }

        for (let i = 0; i < job.times.length; i++) {
          if (job.times[i] !== currentTime) continue

          const key = `${today}_${i}`

          if (job.lastSentDates?.[key] === today) continue

          const post = job.posts[i]
          if (!post) continue

          job.lastSentDates = job.lastSentDates || {}
          job.lastSentDates[key] = today
          await saveDatabase()

          try {
            if (post.type === "photo") {
              await bot.api.sendPhoto(job.chatId, post.fileId, {
                caption: post.caption || undefined,
              })
            } else {
              await bot.api.sendMessage(job.chatId, post.text)
            }
          } catch (error) {
            delete job.lastSentDates[key]
            await saveDatabase()
            console.error("Ошибка публикации в группе:", job.chatId, error)
          }
        }
      }
    } catch (error) {
      console.error("Ошибка автопостера:", error)
    } finally {
      running = false
    }
    }, 30000)
}

async function saveAutopostJob(state) {
  if (!state.chatId) {
    throw new Error("Не выбрана группа для автопостера")
  }

  database.autoposts = database.autoposts || []

  const newJob = {
    active: true,
    chatId: state.chatId,
    expiresAt: new Date(
      Date.now() + state.days * 24 * 60 * 60 * 1000
    ).toISOString(),
    times: state.times,
    posts: state.posts,
    lastSentDates: {},
  }

  const index = database.autoposts.findIndex(
    (job) => String(job.chatId) === String(state.chatId)
  )

  if (index >= 0) {
    database.autoposts[index] = newJob
  } else {
    database.autoposts.push(newJob)
  }

  await saveDatabase()
}

function mainKeyboard() {
  return new InlineKeyboard()
    .text("📦 Поставщики", "products")
    .row()
    .text("🛠 Услуги для общепита", "services")
    .row()
    .text("⚙️ Оборудование для общепита", "equipment")
    .row()
    .text("ℹ️ О проекте", "about")
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
.text("📢 Автопостер", "admin:autopost")
.row()
.text("🏠 Главное меню", "home")
}

function categoryTitle(category, itemId) {
  const index = Number(itemId.slice(1))

  if (category === "meat_farm") {
    return meatNames[index]
  }

  if (category === "meat_halal") {
    return halalMeatNames[index]
  }

  if (category === "meat") {
    const name = meatNames[index]
    return itemId.startsWith("h")
      ? `${name} · ХАЛЯЛЬ`
      : name
  }

    if (category === "dairy") {
    return dairyNames[index]
  }

  if (category === "fish") {
    return fishNames[index]
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

  if (category === "meat_farm") {
    meatNames.forEach((name, i) => {
      keyboard.text(name, `pick:meat_farm:m${i}`).row()
    })
  }

  if (category === "meat_halal") {
    halalMeatNames.forEach((name, i) => {
      keyboard.text(name, `pick:meat_halal:h${i}`).row()
    })
  }

  if (category === "dairy") {
    keyboard
      .text("🏭 Промышленное хозяйство", "dairytype:industrial")
      .row()
      .text("🚜 Фермерское хозяйство", "dairytype:farm")
  }

  if (category === "fish") {
    for (let i = 0; i < fishNames.length; i += 2) {
      keyboard.text(fishNames[i], `pick:fish:f${i}`)
      keyboard.text(fishNames[i + 1], `pick:fish:f${i + 1}`)
      keyboard.row()
    }
  }

  if (category === "fish") {
    keyboard.text("⬅️ Назад", "products").row()
  } else {
    keyboard.text("⬅️ Вернуться к разделам товаров", "products").row()
  }

  keyboard.text("🏠 Главное меню", "home")

  return keyboard
}

async function showCategory(ctx, category, itemId = null, newMessage = false, targetMessageId = null) {
  const suppliers = database.suppliers.filter((supplier) => {
    return supplier.category === category &&
      (supplier.itemId || null) === (itemId || null)
  })

  const title = itemId
    ? categoryTitle(category, itemId)
    : categoryNames.get(category) || category

  if (!suppliers.length) {
    const messageText = `${title}\n\nПоставщиков пока нет.`
    const keyboard = itemId
      ? new InlineKeyboard()
          .text("⬅️ Назад", `product:${category}`)
          .row()
          .text("🏠 Главное меню", "home")
      : backHomeKeyboard()

    if (targetMessageId) {
      await ctx.api.editMessageText(ctx.chat.id, targetMessageId, messageText, {
        reply_markup: keyboard,
      })
    } else {
      await ctx.editMessageText(messageText, { reply_markup: keyboard })
    }
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
      .text("⬅️ Вернуться к списку товаров", `product:${category}`)
      .row()
  } else {
    keyboard.text("⬅️ Назад", "products").row()
  }

  keyboard.text("🏠 Главное меню", "home")

  const messageText = `Раздел: ${title}\n\nВыбери поставщика:`

  if (targetMessageId) {
    await ctx.api.editMessageText(ctx.chat.id, targetMessageId, messageText, {
      reply_markup: keyboard,
    })
  } else if (newMessage) {
    return await ctx.reply(messageText, { reply_markup: keyboard })
  } else {
    await ctx.editMessageText(messageText, { reply_markup: keyboard })
  }
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
export async function registerCommands(bot) {
    await loadDatabase()
  databaseLoaded = true
    startAutopostScheduler(bot)

  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.update.my_chat_member
    const chat = update.chat

    if (!["group", "supergroup"].includes(chat.type)) return

    database.autopostGroups = database.autopostGroups || []

    if (update.new_chat_member.status === "administrator") {
      const group = {
        chatId: chat.id,
        title: chat.title || "Без названия",
        active: true,
      }

      const index = database.autopostGroups.findIndex(
        (item) => String(item.chatId) === String(chat.id)
      )

      if (index >= 0) {
        database.autopostGroups[index] = group
      } else {
        database.autopostGroups.push(group)
      }

      await saveDatabase()
      console.log("Группа автопостера сохранена:", group.title)
    }
  })
  await bot.api.setMyCommands([
    { command: "start", description: "Запустить бота" },
  ])

  await bot.api.setMyCommands(
    [
      { command: "start", description: "Запустить бота" },
      { command: "admin", description: "Панель администратора" },
    ],
    { scope: { type: "chat", chat_id: ADMIN_ID } }
  )
  bot.use(async (ctx, next) => {
    if (!databaseLoaded) {
  await loadDatabase()
  databaseLoaded = true
}
    await next()
  })

    bot.command("start", async (ctx) => {
    if (ctx.chat.type !== "private") return

    await ctx.reply(
      `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}\n\nКаталог поставщиков и услуг для ресторанов, кафе и баров Астаны.`,
      { reply_markup: mainKeyboard() }
    )
  })

  bot.command("connect_autopost", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("⛔️ Доступ запрещён.")
    }

    if (!["group", "supergroup"].includes(ctx.chat.type)) {
      return ctx.reply("Добавь бота в свою группу и отправь эту команду там.")
    }

    const state = userSteps.get(ctx.from.id)

    if (!state || state.step !== "autopostReady") {
      return ctx.reply("Сначала закончи настройку автопостера в личном чате с ботом.")
    }

    database.autoposts = database.autoposts || []

    const newJob = {
      active: true,
      chatId: ctx.chat.id,
      expiresAt: new Date(Date.now() + state.days * 24 * 60 * 60 * 1000).toISOString(),
      times: state.times,
      posts: state.posts,
      lastSentDates: {},
    }

    const existingIndex = database.autoposts.findIndex(
      (job) => String(job.chatId) === String(ctx.chat.id)
    )

    if (existingIndex >= 0) {
      database.autoposts[existingIndex] = newJob
    } else {
      database.autoposts.push(newJob)
    }

    await saveDatabase()

    await ctx.reply("✅ Группа подключена! Настройки автопостера сохранены. Для подключения второй группы отправь /connect_autopost в ней.")
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
  bot.callbackQuery("home:new", async (ctx) => {
  await ctx.answerCallbackQuery()

  const listId = lastSupplierLists.get(ctx.chat.id)

  if (listId) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      listId,
      `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}`,
      { reply_markup: mainKeyboard() }
    )

    lastSupplierLists.delete(ctx.chat.id)
    lastMainMenus.set(ctx.chat.id, listId)
    return
  }

  const menu = await ctx.reply(
    `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}`,
    { reply_markup: mainKeyboard() }
  )

  lastMainMenus.set(ctx.chat.id, menu.message_id)
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

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(
      `🏙 О ПРОЕКТЕ «ОБЩЕПИТ АСТАНА»

«Общепит Астана» — это не просто группа. Это сообщество, благодаря которому более 10 000 человек уже нашли работу.

Присоединяйся к нам!

💬 Наш Telegram-чат: @obshepit_astana

📢 Реклама и сотрудничество
По вопросам размещения и партнёрства пишите: @rabka_uhalla`,
      { reply_markup: backHomeKeyboard() }
    )
  })

  bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const category = ctx.match[1]

        if (category === "meat_farm" || category === "meat_halal") {
      const title = category === "meat_halal"
        ? "🥩 МЯСО И ПТИЦА ХАЛЯЛЬ"
        : "🥩 МЯСО И ПТИЦА ФЕРМЕР"

      await ctx.editMessageText(
        `${title}\n\nВыбери продукт:`,
        { reply_markup: categoryKeyboard(category) }
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

    if (category === "fish") {
      await ctx.editMessageText(
        "🐟 РЫБА И МОРЕПРОДУКТЫ\n\nВыбери продукт:",
        { reply_markup: categoryKeyboard("fish") }
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

  bot.callbackQuery(/^pick:(meat_farm|meat_halal|dairy|fish):([mhpf]\d+)$/, async (ctx) => {
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

    const previousCardId = lastSupplierCards.get(ctx.chat.id)

    if (previousCardId) {
      try {
        await ctx.api.editMessageReplyMarkup(ctx.chat.id, previousCardId, {
          reply_markup: { inline_keyboard: [] },
        })
      } catch (error) {
        console.error("Не удалось убрать кнопки:", error)
      }
    }  
    const supplierListId = lastSupplierLists.get(ctx.chat.id)

    if (supplierListId === ctx.callbackQuery.message.message_id) {
      lastSupplierLists.delete(ctx.chat.id)
    }

    await ctx.deleteMessage()

    for (const photo of supplier.photos || []) {
      await ctx.replyWithPhoto(photo)
    }

    const card = await ctx.reply(text, {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Назад к поставщикам", back)
        .row()
        .text("🏠 Главное меню", "home:new"),
    })

    lastSupplierCards.set(ctx.chat.id, card.message_id) 
  })

 bot.callbackQuery(/^category:([^:]+)(?::([mhpf]\d+))?$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    const menuId = lastMainMenus.get(ctx.chat.id)

    const list = await showCategory(
  ctx,
  ctx.match[1],
  ctx.match[2] || null,
  !menuId,
  menuId || null
)

if (!menuId && list) {
  lastSupplierLists.set(ctx.chat.id, list.message_id)
}

    if (menuId) {
      lastMainMenus.delete(ctx.chat.id)
    }
  })
        bot.callbackQuery("admin:autopost", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const groups = database.autopostGroups || []

    if (groups.length === 0) {
      await ctx.reply(
        "📢 Пока нет подключённых групп.\n\nДобавь бота в группу и выдай ему права администратора."
      )
      return
    }

    const keyboard = new InlineKeyboard()

    for (const group of groups) {
      keyboard
        .text(`📢 ${group.title}`, `autopost:group:${group.chatId}`)
        .row()
    }

    await ctx.reply(
      "📢 ВЫБЕРИ ГРУППУ ДЛЯ АВТОПОСТЕРА:",
      { reply_markup: keyboard }
    )
  })
    bot.callbackQuery(/^autopost:group:(-?\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const chatId = Number(ctx.match[1])

    const group = (database.autopostGroups || []).find(
      (item) => String(item.chatId) === String(chatId)
    )

    if (!group) {
      await ctx.reply("Группа не найдена. Открой автопостер заново.")
      return
    }

    userSteps.set(ctx.from.id, {
      step: "autopostDays",
      chatId: group.chatId,
    })

    await ctx.reply(
      `📢 Группа: ${group.title}\n\nНа сколько дней включить автопостер?\n\nВведи число от 1 до 365.`
    )
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

        if (category === "meat_farm") {
      meatNames.forEach((name, i) => {
        keyboard.text(name, `admin:item:meat_farm:m${i}`).row()
      })
    } else if (category === "meat_halal") {
      halalMeatNames.forEach((name, i) => {
        keyboard.text(name, `admin:item:meat_halal:h${i}`).row()
      })
    } else if (category === "dairy") {
      keyboard
        .text("🏭 Промышленное хозяйство", "admin:dairy:industrial")
        .row()
        .text("🚜 Фермерское хозяйство", "admin:dairy:farm")
        .row()
        } else if (category === "fish") {
      fishNames.forEach((name, i) => {
        keyboard.text(name, `admin:item:fish:f${i}`).row()
      })
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

    bot.callbackQuery("admin:delete", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    if (!database.suppliers.length) {
      await ctx.editMessageText("Поставщиков пока нет.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const keyboard = new InlineKeyboard()

    for (const supplier of database.suppliers) {
      keyboard.text(supplier.name, `delete:select:${supplier.id}`).row()
    }

    keyboard.text("⬅️ Назад", "admin:cancel")

    await ctx.editMessageText(
      "Выбери поставщика, которого нужно удалить:",
      { reply_markup: keyboard }
    )
  })

  bot.callbackQuery(/^delete:select:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const supplier = database.suppliers.find(
      (item) => item.id === ctx.match[1]
    )

    if (!supplier) {
      await ctx.editMessageText("Поставщик не найден.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const keyboard = new InlineKeyboard()
      .text("🗑 Да, удалить", `delete:yes:${supplier.id}`)
      .row()
      .text("❌ Отмена", "admin:cancel")

    await ctx.editMessageText(
      `⚠️ Подтверди удаление поставщика:\n\n${supplier.name}\n${supplier.categoryLabel}\n\nЭто действие нельзя отменить.`,
      { reply_markup: keyboard }
    )
  })

  bot.callbackQuery(/^delete:yes:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const index = database.suppliers.findIndex(
      (item) => item.id === ctx.match[1]
    )

    if (index === -1) {
      await ctx.editMessageText("Поставщик уже удалён или не найден.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const [supplier] = database.suppliers.splice(index, 1)
    await saveDatabase()

    await ctx.editMessageText(
      `✅ Поставщик «${supplier.name}» удалён.`,
      { reply_markup: adminKeyboard() }
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

    bot.callbackQuery("photo:finish", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state || state.step !== "supplierPhotos") return

    await finishSupplier(ctx, state)
  })

  bot.callbackQuery("photo:skip", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state || state.step !== "supplierPhotos") return

    state.photos = []
    await finishSupplier(ctx, state)
  })
  bot.callbackQuery("admin:cancel", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    userSteps.delete(ctx.from.id)

    await ctx.editMessageText("Действие отменено.", {
      reply_markup: adminKeyboard(),
    })
  })

      bot.on("message:photo", async (ctx, next) => {
    const state = userSteps.get(ctx.from.id)

    if (!isAdmin(ctx) || !state) return next()

    if (state.step === "autopostContent") {
      state.posts = state.posts || []
      const photo = ctx.message.photo.at(-1)

      state.posts.push({
        type: "photo",
        fileId: photo.file_id,
        caption: ctx.message.caption || "",
      })

      if (state.posts.length < state.count) {
        await ctx.reply(`Публикация ${state.posts.length} из ${state.count} принята. Отправь следующую: текст или фото с описанием.`)
        return
      }

      state.step = "autopostReady"
      await ctx.reply("Все публикации собраны!")
      return
    }

    if (state.step !== "supplierPhotos") return next()

    const photo = ctx.message.photo.at(-1)
    state.photos.push(photo.file_id)

    const keyboard = new InlineKeyboard()
      .text("✅ Готово", "photo:finish")
      .text("⏭ Пропустить", "photo:skip")

    await ctx.reply(
      `✅ Фото добавлено. Всего фотографий: ${state.photos.length}. Отправь ещё или нажми «Готово».`,
      { reply_markup: keyboard }
    )
  })
  bot.on("message:text", async (ctx, next) => {
    const state = userSteps.get(ctx.from.id)

    if (!state || !["supplier", "duration", "extendDuration", "autopostDays", "autopostCount", "autopostTimes", "autopostContent"].includes(state.step)) return next()
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

        if (state.step === "autopostDays") {
      const days = Number(value)

      if (!Number.isInteger(days) || days < 1 || days > 365) {
        await ctx.reply("Введи число от 1 до 365 дней.")
        return
      }

      state.days = days
      state.step = "autopostCount"

      await ctx.reply("Сколько публикаций в день? Введи 1 или 2.")
      return
    }    
        if (state.step === "autopostCount") {
      const count = Number(value)

      if (!Number.isInteger(count) || count < 1 || count > 2) {
        await ctx.reply("Введи 1 или 2.")
        return
      }

      state.count = count
      state.step = "autopostTimes"

      await ctx.reply(
        count === 1
          ? "Во сколько публиковать? Например: 10:00"
          : "Укажи два времени через запятую. Например: 10:00, 20:00"
      )
      return
    }
          if (state.step === "autopostTimes") {
      const times = value.split(",").map((time) => time.trim())

      if (
        times.length !== state.count ||
        times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
        new Set(times).size !== times.length
      ) {
        await ctx.reply(
          state.count === 1
            ? "Введи время в формате 10:00."
            : "Введи два разных времени через запятую. Например: 10:00, 20:00."
        )
        return
      }

      state.times = times
      state.step = "autopostContent"

      await ctx.reply("Время принято! Теперь отправь текст первой публикации или фотографию с описанием.")
      return
    }
      if (state.step === "autopostContent") {
      state.posts = state.posts || []
      state.posts.push({
        type: "text",
        text: value,
      })

      if (state.posts.length < state.count) {
        await ctx.reply(`Публикация ${state.posts.length} из ${state.count} принята. Отправь следующую: текст или фото с описанием.`)
        return
      }

      state.step = "autopostReady"
      await saveAutopostJob(state)
      await ctx.reply("Все публикации собраны! Автопостер сохранён.")
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
  state.photos = []
  state.step = "supplierPhotos"

  const keyboard = new InlineKeyboard()
    .text("✅ Готово", "photo:finish")
    .text("⏭ Пропустить", "photo:skip")

  await ctx.reply(
    "Отправь фотографии поставщика по одной. Когда закончишь, нажми «Готово». Если фото нет — нажми «Пропустить».",
    { reply_markup: keyboard }
  )
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
