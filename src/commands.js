
const prices = new Map();
const alerts = new Map();

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🍩 Bienvenue sur Donut Market Assistant !\n\n" +
      "Commandes disponibles :\n" +
      "/help - Afficher l'aide\n" +
      "/prix - Voir les prix enregistrés\n" +
      "/ajouter nom prix - Ajouter un prix\n" +
      "/stats - Nombre de prix enregistrés\n" +
      "/alert nom prix - Créer une alerte\n" +
      "/alertes - Voir tes alertes"
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🍩 COMMANDES 🍩\n\n" +
      "/prix - Voir les prix\n" +
      "/ajouter nom prix - Enregistrer un prix\n" +
      "Exemple : /ajouter diamant 500\n" +
      "/stats - Voir les statistiques\n" +
      "/alert nom prix - Créer une alerte\n" +
      "Exemple : /alert diamant 400\n" +
      "/alertes - Voir tes alertes"
    );
  });

  bot.command("ajouter", async (ctx) => {
    const args = String(ctx.match ?? "").trim().split(/\s+/);
    const prix = Number(args.pop());
    const nom = args.join(" ").toLowerCase();

    if (!nom || !Number.isFinite(prix) || prix <= 0) {
      return ctx.reply("Utilise : /ajouter nom prix\nExemple : /ajouter diamant 500");
    }

    prices.set(nom, prix);
    await ctx.reply(`✅ ${nom} enregistré à ${prix} $`);
  });

  bot.command("prix", async (ctx) => {
    if (prices.size === 0) {
      return ctx.reply("Aucun prix enregistré. Utilise /ajouter nom prix.");
    }

    const liste = [...prices.entries()]
      .map(([nom, prix]) => `🍩 ${nom} : ${prix} $`)
      .join("\n");

    await ctx.reply(liste);
  });

  bot.command("stats", async (ctx) => {
    await ctx.reply(`📊 Prix enregistrés : ${prices.size}`);
  });

  bot.command("alert", async (ctx) => {
    const args = String(ctx.match ?? "").trim().split(/\s+/);
    const prix = Number(args.pop());
    const nom = args.join(" ").toLowerCase();

    if (!nom || !Number.isFinite(prix) || prix <= 0) {
      return ctx.reply("Utilise : /alert nom prix\nExemple : /alert diamant 400");
    }

    const key = String(ctx.chat.id);
    if (!alerts.has(key)) alerts.set(key, []);

    alerts.get(key).push({ nom, prix });
    await ctx.reply(`🔔 Alerte créée pour ${nom} à ${prix} $`);
  });

  bot.command("alertes", async (ctx) => {
    const liste = alerts.get(String(ctx.chat.id)) || [];

    if (liste.length === 0) {
      return ctx.reply("Tu n'as aucune alerte.");
    }

    await ctx.reply(
      liste.map(a => `🔔 ${a.nom} : ${a.prix} $`).join("\n")
    );
  });
}
