
import { InlineKeyboard } from "grammy";
import fs from "node:fs/promises";
import path from "node:path";

const CHANNEL = "@VEXORAMOVIES";
const DATA_DIR = path.join(process.cwd(), "data");
const MOVIES_DB = path.join(DATA_DIR, "movies.json");
const LINKS_DB = path.join(DATA_DIR, "links.json");

async function readDB(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return [];
  }
}

async function saveDB(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function getTitle(msg) {
  return (msg.caption || msg.text || "Filim cusub")
    .trim().split("\n")[0];
}

function hasMedia(msg) {
  return !!(
    msg.video || msg.document || msg.photo ||
    msg.audio || msg.animation
  );
}

export function registerCommands(bot) {

  // KEYBOARDS
  const mainKeyboard = new InlineKeyboard()
    .text("🔎 Raadi Filim", "search")
    .row()
    .text("🆕 Filimada cusub", "latest")
    .row()
    .text("🔗 Filimada Links", "links");

  const backKeyboard = new InlineKeyboard()
    .text("🏠 Bogga hore", "home");

  // SAVE CHANNEL MOVIES
  bot.on("channel_post", async (ctx) => {
    const msg = ctx.channelPost;

    if (!hasMedia(msg)) return;

    const movies = await readDB(MOVIES_DB);

    if (movies.some(m => m.message_id === msg.message_id)) {
      return;
    }

    movies.unshift({
      title: getTitle(msg),
      search_text: (msg.caption || msg.text || "").toLowerCase(),
      message_id: msg.message_id,
      date: msg.date
    });

    await saveDB(MOVIES_DB, movies.slice(0, 1000));
  });

  // START
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🎬 KU SOO DHAWOOW VEXORA MOVIES!

Salaan ${ctx.from?.first_name ?? "Saaxiib"}!

Halkan waxaad ka raadin kartaa filimada.

🔎 Raadi filim aad jeceshahay.
🆕 Eeg filimada cusub.
🔗 Eeg links-ka filimada.`,
      { reply_markup: mainKeyboard }
    );
  });

  // HELP
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🎬 VEXORA MOVIES - CAAWIMAAD\n\n" +
      "/start - Bilow\n" +
      "/search Avatar - Raadi filim\n" +
      "/latest - Filimada cusub\n" +
      "/links - Links-ka filimada\n" +
      "/help - Caawimaad"
    );
  });

  // SEARCH MOVIES
  async function searchMovie(ctx, query) {
    if (!query) {
      return ctx.reply("🔎 Fadlan qor magaca filimka.");
    }

    const movies = await readDB(MOVIES_DB);
    const q = query.toLowerCase();

    const results = movies.filter(movie =>
      movie.title.toLowerCase().includes(q) ||
      (movie.search_text || "").includes(q)
    ).slice(0, 5);

    if (!results.length) {
      return ctx.reply(
        "😔 Filimkaas lama helin.\nIsku day magac kale."
      );
    }

    await ctx.reply(`🎬 Waxaan helay ${results.length} filim:`);

    for (const movie of results) {
      try {
        await ctx.api.copyMessage(
          ctx.chat.id,
          CHANNEL,
          movie.message_id
        );
      } catch (error) {
        console.error(error);
        await ctx.reply(`❌ ${movie.title} lama soo diri karin.`);
      }
    }
  }

  bot.command("search", async (ctx) => {
    await searchMovie(ctx, String(ctx.match || "").trim());
  });

  // LATEST MOVIES
  async function sendLatest(ctx) {
    const movies = await readDB(MOVIES_DB);

    if (!movies.length) {
      return ctx.reply("Weli filimaan cusub lama hayo.");
    }

    await ctx.reply("🆕 FILIMADA UGU CUSUB:");

    for (const movie of movies.slice(0, 5)) {
      try {
        await ctx.api.copyMessage(
          ctx.chat.id,
          CHANNEL,
          movie.message_id
        );
      } catch (error) {
        console.error(error);
        await ctx.reply(movie.title);
      }
    }
  }

  bot.command("latest", sendLatest);

  // MOVIE LINKS
  async function sendLinks(ctx) {
    const links = await readDB(LINKS_DB);

    if (!links.length) {
      return ctx.reply("Weli links lama darin.");
    }

    for (const item of links.slice(0, 20)) {
      const keyboard = new InlineKeyboard()
        .url("▶️ Daawo Filimka", item.url);

      await ctx.reply(`🎬 ${item.title}`, {
        reply_markup: keyboard
      });
    }
  }

  bot.command("links", sendLinks);

  // ADD LINK - CHANNEL ADMIN ONLY
  bot.command("addlink", async (ctx) => {
    try {
      const member = await ctx.api.getChatMember(
        CHANNEL,
        ctx.from.id
      );

      if (!["creator", "administrator"].includes(member.status)) {
        return ctx.reply("⛔ Admin kaliya ayaa isticmaali kara.");
      }

      const parts = String(ctx.match || "")
        .split("|")
        .map(x => x.trim());

      const [title, url] = parts;

      if (
        !title ||
        !url ||
        !/^https:\/\/\S+$/i.test(url)
      ) {
        return ctx.reply(
          "Isticmaal:\n/addlink Avatar | https://example.com"
        );
      }

      const links = await readDB(LINKS_DB);
      links.unshift({ title, url });

      await saveDB(LINKS_DB, links);

      await ctx.reply("✅ Link-ga waa lagu daray!");

    } catch (error) {
      console.error(error);
      await ctx.reply("❌ Ma awoodin inaan xaqiijiyo Admin-ka.");
    }
  });

  // BUTTON: SEARCH
  bot.callbackQuery("search", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("🔎 Hadda qor magaca filimka aad rabto.");
  });

  // BUTTON: LATEST
  bot.callbackQuery("latest", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendLatest(ctx);
  });

  // BUTTON: LINKS
  bot.callbackQuery("links", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendLinks(ctx);
  });

  // BUTTON: HOME
  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.reply("🏠 Ku soo noqo bogga hore!", {
      reply_markup: mainKeyboard
    });
  });

  // USER TEXT SEARCH
  bot.on("message:text", async (ctx) => {
    const query = ctx.message.text.trim();

    if (!query || query.startsWith("/")) return;

    await searchMovie(ctx, query);
  });

}

