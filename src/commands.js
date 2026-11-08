import { InlineKeyboard } from "grammy"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

const ADMIN_ID = 8810466796
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data")
const DATABASE_FILE = path.join(DATA_DIR, "obshepit-astana.json")

const products = [
  ["🥩 Мясо Халяль", "meat_halal"],
  ["🍗 Птица Халяль", "poultry_halal"],
  ["🥩 Мясо фермерское", "meat_farm"],
  ["🍗 Птица фермерская", "poultry_farm"],
  ["🐟 Рыба", "fish"],
  ["🦐 Морепродукты", "seafood"],
  ["🥒 Овощи", "vegetables"],
  ["🍎 Фрукты", "fruits"],
  ["🧀 Молочная продукция", "dairy"],
  ["🥫 Бакалея", "grocery"],
  ["🛒 Продукты", "food"],
  ["🥟 Полуфабрикаты", "semi_finished"],
  ["🥓 Колбасы и сосиски", "sausages"],
  ["❄️ Замороженная продукция", "equipment"],
  ["☕ Кофейная продукция", "bar"],
  ["🍸 Барная продукция", "bar_products"],
  ["🍽 Посуда для кухни и бара", "tableware"],
  ["🔪 Инвентарь для кухни и бара", "inventory"],
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
  ...products.map(([name, id]) => [id, name.toUpperCase()]),
  ...services.map(([name, id]) => [id, name.toUpperCase()]),
])

const userSteps = new Map()
const lastSupplierCards = new Map()
const lastMainMenus = new Map()
const lastSupplierLists = new Map()
const businessPhotoMessages = new Map()
const supplierPhotoMessages = new Map()

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

  if (!Array.isArray(database.businesses)) {
    database.businesses = []
  }

    if (!Array.isArray(database.autoposts)) {
    database.autoposts = database.autopost ? [database.autopost] : []
  }

  if (!Array.isArray(database.autopostGroups)) {
    database.autopostGroups = []
  }

    if (!database.stats) {
    database.stats = {
      startCount: 0,
      uniqueUsers: [],
      catalogStarts: 0,
    }
  }

  if (!database.startMessages) {
    database.startMessages = {}
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
      const currentMinutes = Number(get("hour")) * 60 + Number(get("minute"))

      for (const job of jobs) {
        if (!job || !job.active) continue

        if (now >= new Date(job.expiresAt)) {
          job.active = false
          await saveDatabase()
          continue
        }

        if (job.retryAfterAt && Date.now() < job.retryAfterAt) continue

        for (let i = 0; i < job.times.length; i++) {
          const [hours, minutes] = job.times[i].split(":").map(Number)
          const scheduledMinutes = hours * 60 + minutes
          const minutesLate = currentMinutes - scheduledMinutes

          if (minutesLate < 0 || minutesLate > 1439) continue

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
    reply_markup: {
      inline_keyboard: [[
        { text: job.buttonText, url: "https://t.me/ObshepitAstanaBot" }
      ]]
    }
  })
} else {
  await bot.api.sendMessage(job.chatId, post.text, {
    reply_markup: {
      inline_keyboard: [[
        { text: job.buttonText, url: "https://t.me/ObshepitAstanaBot" }
      ]]
    }
  })
}
                 } catch (error) {
            delete job.lastSentDates[key]

            const errorCode = error.error_code
            const description = error.description || error.message || ""

            if (errorCode === 429 && error.parameters?.retry_after) {
              job.retryAfterAt = Date.now() + error.parameters.retry_after * 1000
              console.log("Telegram ограничил отправку. Ожидание:", error.parameters.retry_after, "секунд")
            } else {
              const accessError =
                errorCode === 403 ||
                /chat not found|bot was kicked|not enough rights|bot is not a member/i.test(description)

              if (accessError) {
                job.active = false
                console.log("Автопостер отключён: нет доступа к группе", job.chatId)
              } else {
                console.error("Ошибка публикации в группе:", job.chatId, error)
              }
            }

            await saveDatabase()
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
    buttonText: state.buttonText,
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
    .text("💼 Готовый бизнес", "business")
    .row()
    .text("ℹ️ О проекте", "about")
}

function backHomeKeyboard() {
  return new InlineKeyboard()
    .text("🏠 Главное меню", "home")
}

function listKeyboard(items, prefix, columns = 1) {
  const keyboard = new InlineKeyboard()

  for (let i = 0; i < items.length; i++) {
    const [name, id] = items[i]
    keyboard.text(name, `${prefix}:${id}`)

    if ((i + 1) % columns === 0) {
      keyboard.row()
    }
  }

  if (items.length % columns !== 0) {
    keyboard.row()
  }

  keyboard.text("🏠 Главное меню", "home")
  return keyboard
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("➕ Добавить поставщика", "admin:add")
    .row()
    .text("💼 Добавить готовый бизнес", "admin:business:add")
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
    .text("❌ Удалить готовый бизнес", "admin:business:delete")
    .row()
    .text("📢 Автопостер", "admin:autopost")
    .row()
    .text("📊 Статистика", "admin:stats")
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

      keyboard
    .text("⬅️ Назад к разделам товаров", "products")
    .text("🏠 Главное меню", "home")

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
  const keyboard = new InlineKeyboard()
    .text("⬅️ Назад к разделам товаров", "products")
    .text("🏠 Главное меню", "home")

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

  keyboard
  .text("⬅️ Назад к разделам товаров", "products")
  .text("🏠 Главное меню", "home")

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

  for (let i = 0; i < products.length; i += 2) {
  keyboard.text(products[i][0], `admin:cat:${products[i][1]}`)
  if (products[i + 1]) {
    keyboard.text(products[i + 1][0], `admin:cat:${products[i + 1][1]}`)
  }
  keyboard.row()
}

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
    database.autoposts = database.autoposts || []

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
    } else {
      const job = database.autoposts.find(
        (item) => String(item.chatId) === String(chat.id)
      )

      if (job) {
        job.active = false
      }

      database.autopostGroups = database.autopostGroups.filter(
        (item) => String(item.chatId) !== String(chat.id)
      )

      await saveDatabase()
      console.log("Группа отключена:", chat.title)
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

    if (!database.stats) {
      database.stats = {
        startCount: 0,
        uniqueUsers: [],
        catalogStarts: 0,
      }
    }

    database.stats.startCount += 1

    const userId = ctx.from.id
    if (!database.stats.uniqueUsers.includes(userId)) {
      database.stats.uniqueUsers.push(userId)
    }

    if (ctx.match === "catalog") {
      database.stats.catalogStarts += 1
    }

    await saveDatabase()

    const menuText = `🏙 ОБЩЕПИТ АСТАНА\n\nСписок актуален на ${dateToday()}\n\nКаталог поставщиков и услуг для ресторанов, кафе и баров Астаны.`
    const previousMessageId = database.startMessages[userId]
    console.log("START: пользователь", userId, "предыдущее меню:", previousMessageId)

    if (previousMessageId) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          previousMessageId,
          menuText,
          { reply_markup: mainKeyboard() }
        )
        return
      } catch (error) {
        console.log("Не удалось обновить старое меню:", error.message)
      }
    }

      const message = await ctx.reply(menuText, {
      reply_markup: mainKeyboard(),
    })

    console.log("START: новое меню отправлено, ID:", message.message_id)

    database.startMessages[userId] = message.message_id
    await saveDatabase()
    console.log("START: ID меню сохранён")
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

    bot.callbackQuery("admin:stats", async (ctx) => {
    await ctx.answerCallbackQuery()

    if (!isAdmin(ctx)) return

    const currentText = ctx.callbackQuery.message?.text || ""

    if (currentText.startsWith("📊 СТАТИСТИКА")) {
      await ctx.editMessageText("🔐 Панель администратора", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const stats = database.stats || {
      startCount: 0,
      uniqueUsers: [],
      catalogStarts: 0,
    }

    await ctx.editMessageText(
      `📊 СТАТИСТИКА\n\n▶️ Всего запусков START: ${stats.startCount}\n👤 Уникальных пользователей: ${stats.uniqueUsers.length}\n🚀 Запусков по ссылке каталога: ${stats.catalogStarts}`,
      { reply_markup: adminKeyboard() }
    )
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
      reply_markup: listKeyboard(products, "product", 2),
    })
  })

  bot.callbackQuery("services", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText("🛠 УСЛУГИ\n\nВыбери направление:", {
      reply_markup: listKeyboard(services, "service"),
    })
  })

      bot.callbackQuery("business", async (ctx) => {
    await ctx.answerCallbackQuery()

    const messageIds = businessPhotoMessages.get(ctx.chat.id) || []

    for (const messageId of messageIds) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, messageId)
      } catch (error) {
        console.log("Не удалось удалить фото:", messageId)
      }
    }

    businessPhotoMessages.delete(ctx.chat.id)

    const businesses = database.businesses || []

    if (businesses.length === 0) {
      await ctx.editMessageText(
        "💼 ГОТОВЫЙ БИЗНЕС\n\nПока нет объявлений.",
        { reply_markup: backHomeKeyboard() }
      )
      return
    }

    const keyboard = new InlineKeyboard()

    for (const business of businesses) {
      keyboard.text(
        `${business.format} — ${business.price.toLocaleString("ru-RU")} ₸`,
        `business:view:${business.id}`
      ).row()
    }

      keyboard.text("🏠 Главное меню", "home")

    await ctx.editMessageText(
      "💼 ГОТОВЫЙ БИЗНЕС\n\nВыбери интересующий объект:",
      { reply_markup: keyboard }
    )
  })

    bot.callbackQuery(/^business:view:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()

    try {
      await ctx.deleteMessage()
    } catch (error) {
      console.log("Не удалось удалить старый список")
    }

    const id = ctx.match[1]
    const business = (database.businesses || []).find(item => item.id === id)

    if (!business) {
      await ctx.reply("Объявление не найдено.")
      return
    }

    const messageIds = []

    const keyboard = new InlineKeyboard()
      .text("⬅️ Назад к списку", "business")

    if (business.photos && business.photos.length > 0) {
      for (let i = 0; i < business.photos.length; i += 10) {
        const album = business.photos
          .slice(i, i + 10)
          .map(photo => ({ type: "photo", media: photo }))

        if (album.length === 1) {
          const message = await ctx.replyWithPhoto(album[0].media)
          messageIds.push(message.message_id)
        } else {
          const messages = await ctx.replyWithMediaGroup(album)
          messageIds.push(...messages.map(message => message.message_id))
        }
      }
    }

    businessPhotoMessages.set(ctx.chat.id, messageIds)

    await ctx.reply(
      `💼 ${business.format}

Площадь: ${business.area} м²
Электричество: ${business.electricity} кВт
Комнат: ${business.rooms}
Водопровод: ${business.water}
Канализация: ${business.sewer}
Отопление: ${business.heating}
Адрес: ${business.address}
Статус: ${business.status}
Оборудование: ${business.equipment}
Цена: ${business.price.toLocaleString("ru-RU")} ₸`,
      { reply_markup: keyboard }
    )
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
    ? "🥩 МЯСО ХАЛЯЛЬ"
    : "🥩 МЯСО ФЕРМЕРСКОЕ"

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
        "🐟 РЫБА\n\nВыбери продукт:",
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

    keyboard
  .text("⬅️ Назад", "product:dairy")
  .text("🏠 Главное меню", "home")

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

    const photoMessageIds = []

    for (const photo of supplier.photos || []) {
      const message = await ctx.replyWithPhoto(photo)
      photoMessageIds.push(message.message_id)
    }

    supplierPhotoMessages.set(ctx.chat.id, photoMessageIds)

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

    const photoMessageIds = supplierPhotoMessages.get(ctx.chat.id) || []

    for (const messageId of photoMessageIds) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, messageId)
      } catch (error) {
        console.log("Не удалось удалить фото поставщика:", messageId)
      }
    }

    supplierPhotoMessages.delete(ctx.chat.id)

        const supplierCardId = lastSupplierCards.get(ctx.chat.id)

    if (supplierCardId === ctx.callbackQuery.message.message_id) {
      try {
        await ctx.deleteMessage()
      } catch (error) {
        console.log("Не удалось удалить карточку поставщика")
      }

      lastSupplierCards.delete(ctx.chat.id)
    }

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
      const job = (database.autoposts || []).find(
        (item) => String(item.chatId) === String(group.chatId)
      )

      keyboard
        .text(
          `${job?.active ? "🟢" : "⚪"} ${group.title}`,
          `autopost:group:${group.chatId}`
        )
        .row()

      if (job?.active) {
        keyboard
          .text(
            `⛔ Отключить: ${group.title}`,
            `autopost:stop:${group.chatId}`
          )
          .row()
      }
    }

    await ctx.reply(
      "📢 УПРАВЛЕНИЕ АВТОПОСТЕРОМ:",
      { reply_markup: keyboard }
    )
  })

  bot.callbackQuery(/^autopost:stop:(-?\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const chatId = Number(ctx.match[1])

    const job = (database.autoposts || []).find(
      (item) => String(item.chatId) === String(chatId)
    )

    if (!job || !job.active) {
      await ctx.reply("Автопостер этой группы уже отключён.")
      return
    }

    job.active = false
    await saveDatabase()

    await ctx.reply("⛔ Автопостер этой группы отключён.")
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

  bot.callbackQuery("admin:business:add", async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!isAdmin(ctx)) return

  const keyboard = new InlineKeyboard()
    .text("🍽 Ресторан", "business:format:Ресторан")
    .row()
    .text("🛒 Супермаркет", "business:format:Супермаркет")
    .row()
    .text("☕ Кафе", "business:format:Кафе")
    .row()
    .text("🥐 Пекарня", "business:format:Пекарня")
    .row()
    .text("✏️ Другое", "business:format:Другое")
    .row()
    .text("❌ Отмена", "admin:cancel")

  await ctx.reply("💼 Выбери формат бизнеса:", {
    reply_markup: keyboard,
  })
})

  bot.callbackQuery(/^business:format:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!isAdmin(ctx)) return

    const format = ctx.match[1]

  userSteps.set(ctx.from.id, {
    step: format === "Другое" ? "businessFormat" : "businessArea",
    format: format === "Другое" ? "" : format,
  })

      const cancelKeyboard = new InlineKeyboard()
    .text("❌ Отмена", "business:cancel")

    if (format === "Другое") {
    await ctx.reply("✏️ Напиши свой формат бизнеса:", {
      reply_markup: cancelKeyboard,
    })
    return
  }

  await ctx.reply(`Формат: ${format}\n\nУкажи площадь помещения в квадратных метрах. Например: 150`, {
    reply_markup: cancelKeyboard,
  })
})
    bot.callbackQuery(/^business:water:(yes|no)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state) return

    state.water = ctx.match[1] === "yes" ? "Есть" : "Нет"
    state.step = "businessSewer"

    const keyboard = new InlineKeyboard()
      .text("Есть", "business:sewer:yes")
      .text("Нет", "business:sewer:no")

    await ctx.reply("Есть ли канализация?", {
      reply_markup: keyboard,
    })
  })
    bot.callbackQuery(/^business:sewer:(yes|no)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state) return

    state.sewer = ctx.match[1] === "yes" ? "Есть" : "Нет"
    state.step = "businessHeating"

    const keyboard = new InlineKeyboard()
      .text("Есть", "business:heating:yes")
      .text("Нет", "business:heating:no")

    await ctx.reply("Есть ли отопление?", {
      reply_markup: keyboard,
    })
  })
    bot.callbackQuery(/^business:heating:(yes|no)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state) return

    state.heating = ctx.match[1] === "yes" ? "Есть" : "Нет"
    state.step = "businessAddress"

    await ctx.reply("Укажи адрес объекта:")
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
    bot.callbackQuery("admin:business:delete", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    if (!database.businesses.length) {
      await ctx.editMessageText("Готового бизнеса пока нет.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const keyboard = new InlineKeyboard()

    for (const business of database.businesses) {
      keyboard.text(
        `${business.format} — ${business.price.toLocaleString("ru-RU")} ₸`,
        `business:delete:select:${business.id}`
      ).row()
    }

    keyboard.text("⬅️ Назад", "admin:cancel")

    await ctx.editMessageText(
      "Выбери готовый бизнес, который нужно удалить:",
      { reply_markup: keyboard }
    )
  })

  bot.callbackQuery(/^business:delete:select:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const business = database.businesses.find(
      (item) => item.id === ctx.match[1]
    )

    if (!business) {
      await ctx.editMessageText("Объект не найден.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const keyboard = new InlineKeyboard()
      .text("🗑 Да, удалить", `business:delete:yes:${business.id}`)
      .row()
      .text("❌ Отмена", "admin:cancel")

    await ctx.editMessageText(
      `⚠️ Подтверди удаление бизнеса:\n\n${business.format}\n${business.address}\n${business.price.toLocaleString("ru-RU")} ₸\n\nЭто действие нельзя отменить.`,
      { reply_markup: keyboard }
    )
  })

  bot.callbackQuery(/^business:delete:yes:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const index = database.businesses.findIndex(
      (item) => item.id === ctx.match[1]
    )

    if (index === -1) {
      await ctx.editMessageText("Объект уже удалён или не найден.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    const [business] = database.businesses.splice(index, 1)
    await saveDatabase()

    await ctx.editMessageText(
      `✅ Бизнес «${business.format}» удалён.`,
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
      bot.callbackQuery("business:cancel", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    userSteps.delete(ctx.from.id)

    await ctx.reply(
      "❌ Создание карточки готового бизнеса отменено.",
      { reply_markup: adminKeyboard() }
    )
  })
    bot.callbackQuery("business:photos:finish", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state || state.step !== "businessPhotos") return

    if (!state.photos || state.photos.length === 0) {
      await ctx.reply("Сначала отправь хотя бы одну фотографию.")
      return
    }

    state.step = "businessReady"

    const keyboard = new InlineKeyboard()
      .text("✅ Подтвердить", "business:publish")
      .row()
      .text("❌ Отменить", "business:cancel")

    await ctx.reply(
      `ПРОВЕРЬ КАРТОЧКУ БИЗНЕСА

Формат: ${state.format}
Площадь: ${state.area} м²
Электричество: ${state.electricity} кВт
Комнат: ${state.rooms}
Водопровод: ${state.water}
Канализация: ${state.sewer}
Отопление: ${state.heating}
Адрес: ${state.address}
Статус: ${state.status}
Оборудование: ${state.equipment}
Цена: ${state.price.toLocaleString("ru-RU")} ₸
Фотографий: ${state.photos.length}

Подтверди карточку:`,
      { reply_markup: keyboard }
    )
  })
    bot.callbackQuery("business:publish", async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state || state.step !== "businessReady") return

    const business = {
      id: crypto.randomUUID(),
      format: state.format,
      area: state.area,
      electricity: state.electricity,
      rooms: state.rooms,
      water: state.water,
      sewer: state.sewer,
      heating: state.heating,
      address: state.address,
      status: state.status,
      equipment: state.equipment,
      price: state.price,
      photos: state.photos || [],
      createdAt: new Date().toISOString(),
    }

    database.businesses.push(business)
    await saveDatabase()
    userSteps.delete(ctx.from.id)

    await ctx.reply(
      "✅ Готовый бизнес успешно сохранён!",
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

      state.step = "autopostButton"
      await ctx.reply("Публикации приняты! Теперь напиши текст кнопки, которая будет вести в наш бот.")
      return
    }

        if (state.step === "businessPhotos") {
      const photo = ctx.message.photo.at(-1)
      state.photos.push(photo.file_id)

      const keyboard = new InlineKeyboard()
        .text("✅ Готово", "business:photos:finish")

      await ctx.reply(
        `Фото добавлено. Всего фотографий: ${state.photos.length}. Отправь ещё или нажми «Готово».`,
        { reply_markup: keyboard }
      )
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

    if (!isAdmin(ctx) || !state || state.step !== "businessAddress") {
      return next()
    }

    const address = ctx.message.text.trim()

    if (!address) {
      await ctx.reply("Укажи адрес объекта:")
      return
    }

    if (address === "/cancel") {
      userSteps.delete(ctx.from.id)
      await ctx.reply("Действие отменено.", {
        reply_markup: adminKeyboard(),
      })
      return
    }

    state.address = address
    state.step = "businessStatus"

    const keyboard = new InlineKeyboard()
      .text("Действующий", "business:status:active")
      .row()
      .text("Закрытый", "business:status:closed")

    await ctx.reply("Какой статус у объекта?", {
      reply_markup: keyboard,
    })
  })
    bot.callbackQuery(/^business:status:(active|closed)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state) return

    state.status = ctx.match[1] === "active" ? "Действующий" : "Закрытый"
    state.step = "businessEquipment"

    const keyboard = new InlineKeyboard()
      .text("Входит в стоимость", "business:equipment:yes")
      .row()
      .text("Не входит в стоимость", "business:equipment:no")

    await ctx.reply("Оборудование входит в стоимость бизнеса?", {
      reply_markup: keyboard,
    })
  })
    bot.callbackQuery(/^business:equipment:(yes|no)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!isAdmin(ctx)) return

    const state = userSteps.get(ctx.from.id)
    if (!state) return

    state.equipment = ctx.match[1] === "yes"
      ? "Входит в стоимость"
      : "Не входит в стоимость"

    state.step = "businessPrice"

    await ctx.reply("Укажи стоимость готового бизнеса в тенге. Например: 25000000")
  })
    bot.on("message:text", async (ctx, next) => {
    const state = userSteps.get(ctx.from.id)

    if (!isAdmin(ctx) || !state || state.step !== "businessPrice") {
      return next()
    }

    const value = ctx.message.text.trim()
    const price = Number(value.replace(/\s/g, ""))

    if (!Number.isFinite(price) || price <= 0) {
      await ctx.reply("Введи корректную стоимость в тенге. Например: 25000000")
      return
    }

    state.price = price
    state.step = "businessPhotos"
    state.photos = []

    await ctx.reply("Теперь отправь фотографии бизнеса. Можно несколько: фасад, зал, кухня.")
  })
  bot.on("message:text", async (ctx, next) => {
    const state = userSteps.get(ctx.from.id)

if (!state || !["supplier", "duration", "extendDuration", "autopostDays", "autopostCount", "autopostTimes", "autopostContent", "autopostButton", "businessFormat", "businessArea", "businessElectricity", "businessRooms"].includes(state.step)) return next()
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
    if (state.step === "autopostButton") {
  if (value.length > 64) {
    await ctx.reply("Текст кнопки слишком длинный. Введи не более 64 символов.")
    return
  }

  state.buttonText = value
  await saveAutopostJob(state)
  state.step = "autopostReady"
  await ctx.reply("Все публикации и кнопка сохранены! Автопостер запущен.")
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

      state.step = "autopostButton"
      await ctx.reply("Публикации приняты! Теперь напиши текст кнопки, которая будет вести в наш бот.")
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
        if (state.step === "businessFormat") {
  state.format = value
  state.step = "businessArea"

  await ctx.reply(`Формат: ${state.format}\n\nУкажи площадь помещения в квадратных метрах. Например: 150`)
  return
}
        if (state.step === "businessArea") {
      const area = Number(value)

      if (!Number.isFinite(area) || area <= 0) {
        await ctx.reply("Введи корректную площадь в квадратных метрах. Например: 150")
        return
      }

      state.area = area
      state.step = "businessElectricity"

      await ctx.reply("Укажи мощность электричества в кВт. Например: 120")
      return
    }

        if (state.step === "businessElectricity") {
      const electricity = Number(value)

      if (!Number.isFinite(electricity) || electricity <= 0) {
        await ctx.reply("Введи корректную мощность в кВт. Например: 120")
        return
      }

      state.electricity = electricity
      state.step = "businessRooms"

      await ctx.reply("Укажи количество комнат в помещении. Например: 5")
      return
    }

        if (state.step === "businessRooms") {
      const rooms = Number(value)

      if (!Number.isInteger(rooms) || rooms < 0) {
        await ctx.reply("Укажи количество комнат целым числом. Например: 5")
        return
      }

      state.rooms = rooms
      state.step = "businessWater"

      const keyboard = new InlineKeyboard()
        .text("Есть", "business:water:yes")
        .text("Нет", "business:water:no")

      await ctx.reply("Есть ли водопровод?", {
        reply_markup: keyboard,
      })
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
