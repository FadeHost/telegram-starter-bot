
import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply(
      "📌 BIENVENUE CHEZ LATECH !\n\n" +
      "Bienvenue sur le bot officiel LATECH 👋\n\n" +
      "Découvre notre guide pour apprendre à mieux vendre sur Vinted et développer ton activité.\n\n" +
      "📚 Utilise les commandes ci-dessous pour naviguer :",
      {
        reply_markup: new InlineKeyboard()
          .text("📚 Découvrir le guide Vinted", "ebook")
          .row()
          .text("ℹ️ Aide et commandes", "help"),
      }
    )
  )

  bot.command("ebook", (ctx) =>
    ctx.reply(
      "📚 LE GUIDE VINTED LATECH\n\n" +
      "Découvre notre guide pour apprendre à optimiser tes ventes sur Vinted !\n\n" +
      "👉 Pour obtenir le guide, consulte le lien d'achat que tu as prévu de partager."
    )
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "📌 COMMANDES LATECH\n\n" +
      "/start - Accueil\n" +
      "/ebook - Découvrir le guide Vinted\n" +
      "/help - Afficher l'aide"
    )
  )

  bot.callbackQuery("ebook", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "📚 Pour découvrir le guide Vinted LATECH, utilise la commande /ebook."
    )
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "📌 COMMANDES LATECH\n\n" +
      "/start - Accueil\n" +
      "/ebook - Découvrir le guide Vinted\n" +
      "/help - Afficher l'aide"
    )
  })
}
