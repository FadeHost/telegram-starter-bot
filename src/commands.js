// Your bot's behaviour. Add commands here; grammY's docs (grammy.dev) cover
// keyboards, sessions, files, inline queries and everything else.

const JIKAN_API = "https://api.jikan.moe/v4/anime";

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🍥 Welcome to Anime Finder!\n\n" +
      "I can search anime for you.\n\n" +
      "Send an anime name, for example:\n" +
      "Naruto\n" +
      "One Piece\n" +
      "Jujutsu Kaisen\n\n" +
      "Commands:\n" +
      "/start - Start the bot\n" +
      "/help - Show help\n" +
      "/top - Find top anime"
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🔎 Just send me an anime name!\n" +
      "Example: Naruto\n\n" +
      "/top - Search top-rated anime"
    );
  });

  bot.command("top", async (ctx) => {
    await ctx.reply("⏳ Finding top anime...");
    try {
      const response = await fetch(
        JIKAN_API + "?order_by=score&sort=desc&limit=5"
      );
      if (!response.ok) throw new Error("API error");

      const result = await response.json();
      const list = result.data.map((a, i) =>
        `${i + 1}. ${a.title}\n⭐ Rating: ${a.score ?? "N/A"}\n📺 Episodes: ${a.episodes ?? "Unknown"}`
      );

      await ctx.reply("🏆 Top Anime\n\n" + list.join("\n\n"));
    } catch {
      await ctx.reply("Sorry, I couldn't fetch top anime. Try again later.");
    }
  });

  bot.on("message:text", async (ctx) => {
    const query = ctx.message.text.trim();

    if (query.startsWith("/")) return;
    if (!query) return;

    await ctx.reply("🔍 Searching anime: " + query);

    try {
      const url = JIKAN_API +
        "?q=" + encodeURIComponent(query) + "&limit=5";

      const response = await fetch(url);
      if (!response.ok) throw new Error("API error");

      const result = await response.json();

      if (!result.data || result.data.length === 0) {
        await ctx.reply("❌ No anime found. Try another name.");
        return;
      }

      for (const anime of result.data) {
        const title = anime.title || "Unknown";
        const year = anime.year || anime.aired?.prop?.from?.year || "Unknown";
        const score = anime.score ?? "Not rated";
        const episodes = anime.episodes ?? "Unknown";
        const synopsis = anime.synopsis
          ? anime.synopsis.slice(0, 650)
          : "No synopsis available.";

        await ctx.reply(
          `🎌 ${title}\n\n` +
          `⭐ Rating: ${score}\n` +
          `📅 Year: ${year}\n` +
          `📺 Episodes: ${episodes}\n\n` +
          `📖 ${synopsis}\n\n` +
          `🔗 ${anime.url}`
        );
      }
    } catch {
      await ctx.reply(
        "⚠️ Search failed. Please try again in a few seconds."
      );
    }
  });
}

