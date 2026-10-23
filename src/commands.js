export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🎵 Salom! Menga musiqa yubor, men uni @ShunchakiMusiqaUz kanaliga joylayman!"
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🎵 Menga audio shaklidagi musiqa yubor.\n" +
      "Men uni @ShunchakiMusiqaUz kanaliga joylayman."
    );
  });

  bot.on("message:audio", async (ctx) => {
    try {
      const audio = ctx.message.audio;
      const title = audio.title || "Noma'lum qo'shiq";
      const artist = audio.performer || "Noma'lum ijrochi";

      const caption =
        `🎵 ${title}\n` +
        `🎤 ${artist}\n\n` +
        `📢 @ShunchakiMusiqaUz`;

      await ctx.api.sendAudio(
        "@ShunchakiMusiqaUz",
        audio.file_id,
        { caption }
      );

      await ctx.reply("✅ Musiqa kanalingga joylandi!");
    } catch (error) {
      console.error("Musiqa yuborish xatosi:", error);

      await ctx.reply(
        "❌ Musiqani kanalga joylay olmadim. Bot kanal administratori ekanini tekshir."
      );
    }
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;

    await ctx.reply("🎵 Musiqa yuborish uchun audio fayl jo‘nat!");
  });
}



