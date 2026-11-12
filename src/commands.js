import { InlineKeyboard } from "grammy"

const categories = [
  ["Amazon", "amazon"],
  ["Apple / iTunes", "apple"],
  ["Google Play", "google"],
  ["Steam", "steam"],
  ["PlayStation", "playstation"],
  ["Xbox", "xbox"],
  ["Razer Gold", "razer"],
  ["Roblox", "roblox"],
  ["Netflix", "netflix"],
  ["Walmart", "walmart"],
  ["Nike", "nike"],
  ["Other Gift Cards", "other"],
]

export function registerCommands(bot) {

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🛍️ Buy Gift Cards", "buy")
      .row()
      .text("📦 My Orders", "orders")
      .row()
      .text("💳 Payment Information", "payment")
      .row()
      .text("💬 Customer Support", "support")

    await ctx.reply(
      `🏪 WELCOME TO GIFT CARD STORE!

Hello ${ctx.from.first_name}!

Buy your favourite gift cards easily and securely.

🎁 Available gift cards
💰 USDT BEP20 payments
⚡ Automated order processing
🔒 Secure transactions

Choose an option below:`,
      { reply_markup: keyboard }
    )
  })

  bot.command("help", (ctx) =>
    ctx.reply(
      "Available commands:\n/start - Open the store\n/help - Help\n/id - Your Telegram ID"
    )
  )

  bot.command("id", (ctx) =>
    ctx.reply(`Your Telegram ID: ${ctx.from.id}`)
  )

  bot.callbackQuery("buy", async (ctx) => {
    const keyboard = new InlineKeyboard()

    for (const [name, id] of categories) {
      keyboard.text(name, `category_${id}`).row()
    }

    keyboard.text("⬅️ Back", "home")

    await ctx.editMessageText(
      "🎁 GIFT CARD CATEGORIES\n\nSelect the gift card you want to purchase:",
      { reply_markup: keyboard }
    )

    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery(/^category_(.+)$/, async (ctx) => {
    const id = ctx.match[1]
    const category = categories.find(item => item[1] === id)

    await ctx.editMessageText(
      `🎁 ${category[0]}\n\nOur ${category[0]} gift card inventory is being prepared.\n\nPlease contact customer support to check availability.`,
      {
        reply_markup: new InlineKeyboard()
          .text("💬 Contact Support", "support")
          .row()
          .text("⬅️ Categories", "buy")
          .row()
          .text("🏠 Main Menu", "home")
      }
    )

    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery("orders", async (ctx) => {
    await ctx.editMessageText(
      "📦 MY ORDERS\n\nYou don't have any orders yet.",
      {
        reply_markup: new InlineKeyboard()
          .text("🛍️ Shop Now", "buy")
          .row()
          .text("🏠 Main Menu", "home")
      }
    )

    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery("payment", async (ctx) => {
    await ctx.editMessageText(
      "💳 PAYMENT INFORMATION\n\nPayment method: USDT\nNetwork: BEP20 (BNB Smart Chain)\n\nPayment processing is currently being configured.\n\nPlease don't send cryptocurrency until checkout is activated.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    )

    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery("support", async (ctx) => {
    await ctx.editMessageText(
      "💬 CUSTOMER SUPPORT\n\nFor assistance with gift cards and orders, please contact the store administrator."
    )

    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery("home", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🛍️ Buy Gift Cards", "buy")
      .row()
      .text("📦 My Orders", "orders")
      .row()
      .text("💳 Payment Information", "payment")
      .row()
      .text("💬 Customer Support", "support")

    await ctx.editMessageText(
      "🏪 GIFT CARD STORE\n\nWelcome back! What would you like to do?",
      { reply_markup: keyboard }
    )

    await ctx.answerCallbackQuery()
  })
}
