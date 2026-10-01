
const prices = new Map();
const alerts = new Map();

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🍩 DONUT MARKET BOT\n\n" +
      "/prix <objet> <prix> — Enregistrer un prix\n" +
      "/prix <objet> — Consulter un prix\n" +
      "/stats — Voir les observations\n" +
      "/alert <objet> <prix> — Créer une alerte\n" +
      "/alertes — Voir tes alertes\n" +
      "/help — Aide"
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "📖 COMMANDES\n\n" +
      "/prix diamond 10000 — Enregistrer un prix\n" +
      "/prix diamond — Consulter le prix\n" +
      "/stats — Statistiques\n" +
      "/alert diamond 9000 — Alerte si le prix atteint 9000 ou moins\n" +
      "/alertes — Liste des alertes"
    );
  });

  bot.command("prix", async (ctx) => {
    const args = ctx.match.trim().split(/\s+/);
    const item = (args[0] || "").toLowerCase();

    if (!item) {
      return ctx.reply("Utilise /prix <objet> [prix]");
    }

    if (args[1]) {
      const price = Number(args[1]);

      if (!Number.isFinite(price) || price <= 0) {
        return ctx.reply("❌ Prix invalide.");
      }

      prices.set(item, price);
      await ctx.reply(`✅ ${item} enregistré à ${price.toLocaleString("fr-FR")} $`);
      return;
    }

    if (!prices.has(item)) {
      return ctx.reply("❌ Aucun prix enregistré pour " + item);
    }

    await ctx.reply(
      `💰 ${item} : ${prices.get(item).toLocaleString("fr-FR")} $`
    );
  });

  bot.command("stats", async (ctx) => {
    if (prices.size === 0) {
      return ctx.reply("📊 Aucune donnée enregistrée pour le moment.");
    }

    const lines = [...prices.entries()].map(
      ([item, price]) => `💎 ${item} : ${price.toLocaleString("fr-FR")} $`
    );

    await ctx.reply("📊 PRIX ENREGISTRÉS\n\n" + lines.join("\n"));
  });

  bot.command("alert", async (ctx) => {
    const args = ctx.match.trim().split(/\s+/);
    const item = (args[0] || "").toLowerCase();
    const limit = Number(args[1]);

    if (!item || !Number.isFinite(limit) || limit <= 0) {
      return ctx.reply("Utilise /alert <objet> <prix>");
    }

    const key = String(ctx.from.id);
    if (!alerts.has(key)) alerts.set(key, []);

    alerts.get(key).push({ item, limit });

    await ctx.reply(
      `🔔 Alerte créée : ${item} à ${limit.toLocaleString("fr-FR")} $ ou moins.`
    );
  });

  bot.command("alertes", async (ctx) => {
    const userAlerts = alerts.get(String(ctx.from.id)) || [];

    if (userAlerts.length === 0) {
      return ctx.reply("Tu n'as aucune alerte.");
    }

    const lines = userAlerts.map(
      (a, i) => `${i + 1}. ${a.item} : ${a.limit.toLocaleString("fr-FR")} $`
    );

    await ctx.reply("🔔 TES ALERTES\n\n" + lines.join("\n"));
  });
}
