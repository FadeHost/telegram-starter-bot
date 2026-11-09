
import { InlineKeyboard } from "grammy";
import fs from "node:fs/promises";
import path from "node:path";

const CHANNEL = "@VEXORAMOVIES";

const DATA_DIR = path.join(process.cwd(), "data");
const MOVIES_DB = path.join(DATA_DIR, "movies.json");
const LINKS_DB = path.join(DATA_DIR, "links.json");

// DATABASE
async function readDB(file) {
  try {
    const data = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveDB(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// FILM TITLE
function getTitle(msg) {
  return (msg.caption || msg.text || "Filim cusub")
    .trim().split("\n")[0];
}

function hasMedia(msg) {
  return !!(
    msg.video ||
    msg.document ||
    msg.photo ||
    msg.audio ||
    msg.animation
  );
}

export function registerCommands(bot) {

  // MAIN MENU
  const keyboard = new InlineKeyboard()
    .text("🔎 Raadi Filim", "search")
    .row()
    .text("🆕 Filimada cusub", "latest")
    .row()
    .text("🔗 Filimada Links", "links");

  // SAVE NEW MOVIES FROM CHANNEL
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
      `🎬 KU SOO DHAWOOW AMERICAN FILMS!

Salaan ${ctx.from?.first_name ?? "Saaxiib"}!

Waxaad halkan ka raadin kartaa filimada aad jeceshahay.

🔎 Raadi filim
🆕 Eeg filimada cusub
🔗 Eeg links-ka filimada

Dooro qaybta aad rabto:`,
      { reply_markup: keyboard }
    );
  });

  // HELP
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🎬 AMERICAN FILMS - CAAWIMAAD\n\n" +
      "/start - Bilow\n" +
      "/search Avatar - Raadi filim\n" +
      "/latest - Filimada cusub\n" +
      "/links - Links-ka filimada\n" +
      "/addlink - Ku dar link (Admin)\n" +
      "/id - Aqoonsigaaga"
    );
  });

  // ID
  bot.command("id", async (ctx) => {
    await ctx.reply(
      `Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from?.id}`
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
        console.error("Search error:", error);
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
        console.error("Latest error:", error);
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
      const linkKeyboard = new InlineKeyboard()
        .url("▶️ Daawo Filimka", item.url);

      await ctx.reply(`🎬 ${item.title}`, {
        reply_markup: linkKeyboard
      });
    }
  }

  bot.command("links", sendLinks);

  // ADD LINK - ADMIN ONLY
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

      let validUrl;

      try {
        validUrl = new URL(url);
      } catch {
        return ctx.reply("❌ Link sax ah geli.");
      }

      if (!title || validUrl.protocol !== "https:") {
        return ctx.reply(
          "Isticmaal:\n\n/addlink Avatar | https://example.com"
        );
      }

      const links = await readDB(LINKS_DB);

      links.unshift({ title, url });

      await saveDB(LINKS_DB, links);

      await ctx.reply("✅ Link-ga waa lagu daray!");

    } catch (error) {
      console.error("Admin error:", error);
      await ctx.reply("❌ Hubinta Admin-ka ayaa fashilantay.");
    }
  });

  // SEARCH BUTTON
  bot.callbackQuery("search", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("🔎 Qor magaca filimka aad raadineyso.");
  });

  // LATEST BUTTON
  bot.callbackQuery("latest", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendLatest(ctx);
  });

  // LINKS BUTTON
  bot.callbackQuery("links", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendLinks(ctx);
  });

  // TEXT SEARCH
  bot.on("message:text", async (ctx) => {
    const query = ctx.message.text.trim();

    if (!query || query.startsWith("/")) return;

    await searchMovie(ctx, query);
  });

}
