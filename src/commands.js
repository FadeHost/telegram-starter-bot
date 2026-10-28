
import { InlineKeyboard } from "grammy"

const jokes = [
  "Подбор в MLBB настолько честный, что даже боты не знают, почему они здесь.",
  "План на катку: выиграть. План подбора: сделать всё возможное, чтобы это не случилось.",
  "Когда говоришь «последняя катка», система подбора воспринимает это как вызов.",
  "LGDT не проигрывает — мы собираем статистику для будущего расследования.",
  "Враг забрал Лорда. Подбор забрал надежду.",
  "Бот в моей команде спросил, где кнопка победы.",
  "Мой винрейт увидел подбор и вышел из игры.",
  "Если катка кажется лёгкой, значит, подбор ещё загружается."
]

const memes = [
  "🗿 LGDT: зашли отдохнуть, вышли с новым седым волосом.",
  "🤡 Подбор: «У вас равные команды». Также подбор: пять разных вселенных в одной команде.",
  "💀 Союзник: «Я тащу». Через минуту: 0/7/1.",
  "🎭 Когда команда пишет «изи», а база уже горит.",
  "🫡 Ещё одна катка — и точно спать. Знакомая легенда.",
  "📉 Винрейт падает, зато опыт страданий растёт.",
  "🧠 Стратегия LGDT: сначала хаос, потом ещё хаос."
]

const reactions = [
  "Подбор уже записал это в личное дело. 🗿",
  "Звучит как начало очередной легендарной катки. 💀",
  "LGDT, сохраняем спокойствие. Хотя бы пытаемся. 🤡",
  "Это сообщение одобрено отделом страданий MLBB.",
  "Пахнет поражением… или гениальной стратегией. 🎭"
]

const random = (items) => items[Math.floor(Math.random() * items.length)]

export function registerCommands(bot) {
  const autoChats = new Set()
  const owners = new Set()

  bot.command("start", (ctx) =>
    ctx.reply(
      `Привет, ${ctx.from?.first_name ?? "легенда"}! Я бот клана LGDT. 🗿\nНапиши /help, чтобы увидеть команды.`,
      { reply_markup: new InlineKeyboard().text("Проверить связь", "ping") }
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply([
      "🔥 Бот клана LGDT",
      "/start — запуск",
      "/help — команды",
      "/ping — проверить связь",
      "/joke — шутка про MLBB",
      "/meme — мемная фраза",
      "/auto_on — включить реакции (админ)",
      "/auto_off — выключить реакции (админ)",
      "/id — ID чата и пользователя"
    ].join("\n"))
  )

  bot.command("ping", (ctx) => ctx.reply("Понг! Бот LGDT на связи. 🟢"))

  bot.command("joke", (ctx) => ctx.reply(random(jokes)))
  bot.command("meme", (ctx) => ctx.reply(random(memes)))

  bot.command("id", (ctx) =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from?.id ?? "unknown"}`)
  )

  bot.callbackQuery("ping", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Понг!" })
  })

  async function isAdmin(ctx) {
    if (!ctx.chat || !ctx.from) return false
    if (ctx.chat.type === "private") return true

    try {
      const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id)
      return ["creator", "administrator"].includes(member.status)
    } catch {
      return false
    }
  }

  bot.command("auto_on", async (ctx) => {
    if (!await isAdmin(ctx)) return ctx.reply("Эта команда доступна только администраторам группы.")
    autoChats.add(ctx.chat.id)
    ctx.reply("Автоматические реакции LGDT включены. 🟢")
  })

  bot.command("auto_off", async (ctx) => {
    if (!await isAdmin(ctx)) return ctx.reply("Эта команда доступна только администраторам группы.")
    autoChats.delete(ctx.chat.id)
    ctx.reply("Автоматические реакции LGDT выключены. 🔕")
  })

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text
    if (text.startsWith("/")) return

    if (ctx.chat.type === "private") {
      return ctx.reply(`Ты написал: ${text}`)
    }

    if (!autoChats.has(ctx.chat.id)) return
    if (Math.random() < 0.12) {
      return ctx.reply(random(reactions))
    }
  })
}
