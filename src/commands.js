
import { InlineKeyboard } from "grammy"

const OWNER_ID = 7793572477

// Активні розмови покупців
const chats = new Map()

// Вибраний покупець для відповіді власника
let selectedChat = null

export function registerCommands(bot) {

  // Головне меню покупця
  bot.command("start", async (ctx) => {
    if (ctx.from.id === OWNER_ID) {
      return ctx.reply("🍬 Bacandilad — панель підтримки\n\nКоманда: /bacandilad")
    }

    await ctx.reply(
      "🍬 Вітаємо в підтримці Bacandilad!\n\nНапишіть своє повідомлення, і ми відповімо вам.\n\nЩоб завершити розмову, напишіть /stop"
    )
  })

  // Завершення розмови покупцем
  bot.command("stop", async (ctx) => {
    const id = ctx.from.id

    if (!chats.has(id)) {
      return ctx.reply("У вас немає активної розмови.")
    }

    chats.delete(id)

    await ctx.reply("🔴 Розмову завершено. Дякуємо за звернення!")

    try {
      await bot.api.sendMessage(
        OWNER_ID,
        `🔴 Покупець завершив розмову.\nID: ${id}`
      )
      await showPanel(bot)
    } catch (error) {
      console.error(error)
    }
  })

  // Адмінпанель
  bot.command("bacandilad", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
      return ctx.reply("⛔ У вас немає доступу.")
    }

    await showPanel(bot)
  })

  // Вибір покупця
  bot.callbackQuery(/^chat_(\d+)$/, async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
      return ctx.answerCallbackQuery({ text: "Немає доступу!" })
    }

    const id = Number(ctx.match[1])
    const customer = chats.get(id)

    if (!customer) {
      return ctx.answerCallbackQuery({
        text: "Ця розмова вже завершена."
      })
    }

    selectedChat = id

    await ctx.answerCallbackQuery()

    await ctx.reply(
      `💬 Відкрито діалог з ${customer.name}\n\nТепер надсилай повідомлення — покупець отримає їх через бота.\n\nДля повернення до панелі: /bacandilad`
    )
  })

  // Відповідь покупцю
  bot.on("message", async (ctx) => {
    const id = ctx.from.id

    // Повідомлення власника
    if (id === OWNER_ID) {
      if (ctx.message.text?.startsWith("/")) return

      if (!selectedChat || !chats.has(selectedChat)) {
        return ctx.reply("Спочатку вибери покупця через /bacandilad")
      }

      try {
        await bot.api.copyMessage(
          selectedChat,
          ctx.chat.id,
          ctx.message.message_id
        )
      } catch (error) {
        await ctx.reply("❌ Не вдалося надіслати повідомлення.")
        console.error(error)
      }

      return
    }

    // Не пересилаємо команди
    if (ctx.message.text?.startsWith("/")) return

    // Створення нової розмови
    if (!chats.has(id)) {
      const name = ctx.from.username
        ? `@${ctx.from.username}`
        : ctx.from.first_name || `Покупець ${id}`

      chats.set(id, { name })

      await ctx.reply(
        "✅ Ваш діалог з підтримкою Bacandilad відкрито!"
      )

      try {
        await showPanel(bot)
      } catch (error) {
        console.error(error)
      }
    }

    // Пересилання повідомлення власнику
    try {
      await bot.api.copyMessage(
        OWNER_ID,
        ctx.chat.id,
        ctx.message.message_id
      )
    } catch (error) {
      console.error(error)
    }
  })
}

// Створення кнопок покупців
async function buildKeyboard() {
  const keyboard = new InlineKeyboard()

  for (const [id, customer] of chats) {
    keyboard.text(customer.name, `chat_${id}`).row()
  }

  return keyboard
}

// Відображення панелі
async function showPanel(bot) {
  const keyboard = await buildKeyboard()

  await bot.api.sendMessage(
    OWNER_ID,
    `🍬 BACANDILAD — ПІДТРИМКА\n\n📩 Активних діалогів: ${chats.size}\n\nВибери покупця:`,
    { reply_markup: keyboard }
  )
}
