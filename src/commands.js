
export function registerCommands(bot) {
  const priceUrl = "https://api.gold-api.com/price/XAU";

  async function getPrice() {
    const response = await fetch(priceUrl);

    if (!response.ok) {
      throw new Error("Price unavailable");
    }

    const data = await response.json();
    const price = Number(data.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Invalid price");
    }

    return price;
  }

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🟡 ربات تحلیل طلا فعال شد!\n\n" +
      "/price - قیمت طلا\n" +
      "/buy - حد ضرر و حد سود نمونه خرید\n" +
      "/sell - حد ضرر و حد سود نمونه فروش\n" +
      "/news - هشدار اخبار اقتصادی\n\n" +
      "⚠️ سطوح خرید و فروش پیشنهادی‌اند و تضمین سود نیستند."
    );
  });

  bot.command("price", async (ctx) => {
    try {
      const price = await getPrice();
      await ctx.reply(
        "🟡 قیمت شاخص جهانی طلا XAU/USD\n\n" +
        "هر اونس: $" +
        price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) +
        "\nمنبع: Gold API"
      );
    } catch {
      await ctx.reply("⚠️ دریافت قیمت ممکن نشد؛ بعداً دوباره تلاش کن.");
    }
  });

  async function showLevels(ctx, side) {
    try {
      const price = await getPrice();
      const buy = side === "buy";
      const stop = price * (buy ? 0.995 : 1.005);
      const target = price * (buy ? 1.01 : 0.99);

      await ctx.reply(
        "📊 سطوح نمونه XAU/USD\n\n" +
        "قیمت مرجع: $" + price.toFixed(2) + "\n" +
        "جهت فرضی: " + (buy ? "خرید" : "فروش") + "\n" +
        "حد ضرر: $" + stop.toFixed(2) + "\n" +
        "حد سود: $" + target.toFixed(2) + "\n\n" +
        "⚠️ این سطوح درصدی و آزمایشی‌اند، نه سیگنال تأییدشده."
      );
    } catch {
      await ctx.reply("⚠️ قیمت دریافت نشد؛ محاسبه انجام نشد.");
    }
  }

  bot.command("buy", (ctx) => showLevels(ctx, "buy"));
  bot.command("sell", (ctx) => showLevels(ctx, "sell"));

  bot.command("news", async (ctx) => {
    await ctx.reply(
      "📰 برای بررسی اخبار مهم اقتصادی دلار، تقویم اقتصادی را ببین:\n" +
      "https://www.forexfactory.com/calendar\n\n" +
      "⚠️ هشدار خودکار اخبار هنوز فعال نشده است."
    );
  });

  bot.command("help", (ctx) => {
    ctx.reply("/price\n/buy\n/sell\n/news");
  });
}
