// npm install grammy
const { Bot } = require("grammy");
const fs = require("fs");

const TOKEN = "9006474738:AAE2CQqSRds--9si84Rc3vgyJZAYO_8JUZA"; // token donné par @BotFather

const BOOST_MSG =
  "Thanks for boosting my channel; add me to get your private role: @fyvbv";

// ---------- Stockage (data.json) ----------
const DB_FILE = "data.json";
const data = Object.assign(
  {
    chats: {}, // groupes où le bot est présent (pour la blacklist globale)
    bl: [], // blacklist de personnes (ban partout)
    words: {}, // blacklist de mots par groupe
    whitelist: [], // users autorisés à utiliser les commandes
    welcome: {}, // message de bienvenue par groupe
    slow: {}, // slowmode (secondes) par groupe
    antiraid: {}, // antiraid on/off par groupe (on par défaut)
    users: {}, // username -> id (pour /ban @user)
  },
  fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, "utf8")) : {}
);
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const bot = new Bot(TOKEN);

// ---------- Helpers ----------
const ANON_ADMIN = 1087968824; // admin anonyme
const ALL = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_invite_users: true,
};

async function getStatus(ctx, userId) {
  try {
    return (await ctx.api.getChatMember(ctx.chat.id, userId)).status;
  } catch {
    return null;
  }
}

async function isAdmin(ctx, userId = ctx.from?.id) {
  if (!userId) return false;
  if (userId === ANON_ADMIN) return true;
  const s = await getStatus(ctx, userId);
  return s === "creator" || s === "administrator";
}

async function privileged(ctx) {
  return data.whitelist.includes(ctx.from.id) || (await isAdmin(ctx));
}

function track(ctx) {
  if (ctx.chat.type !== "private" && !data.chats[ctx.chat.id]) {
    data.chats[ctx.chat.id] = ctx.chat.title || "";
    save();
  }
  const u = ctx.from;
  if (u?.username) {
    const k = u.username.toLowerCase();
    if (data.users[k] !== u.id) {
      data.users[k] = u.id;
      save();
    }
  }
}

// Cible : réponse à un message, ID numérique ou @username déjà vu
function getTarget(ctx) {
  const args = ctx.match.trim().split(/\s+/).filter(Boolean);
  const reply = ctx.msg.reply_to_message?.from;
  if (reply) return { id: reply.id, name: reply.first_name, args };
  const a = args[0];
  if (a && /^\d+$/.test(a)) return { id: Number(a), name: a, args: args.slice(1) };
  if (a && a.startsWith("@")) {
    const id = data.users[a.slice(1).toLowerCase()];
    if (id) return { id, name: a, args: args.slice(1) };
  }
  return null;
}

function parseDuration(s) {
  const m = /^(\d+)([smhdw])$/i.exec(s || "");
  if (!m) return null;
  const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2].toLowerCase()];
  return Number(m[1]) * mult;
}

const safe = (fn) => async (ctx) => {
  try {
    await fn(ctx);
  } catch (e) {
    ctx.reply("❌ " + e.message).catch(() => {});
  }
};

async function kick(ctx, userId) {
  await ctx.api.banChatMember(ctx.chat.id, userId);
  await ctx.api.unbanChatMember(ctx.chat.id, userId, { only_if_banned: true });
}

async function globalBan(api, userId) {
  let ok = 0;
  for (const id of Object.keys(data.chats)) {
    try {
      await api.banChatMember(id, userId);
      ok++;
    } catch {}
  }
  return ok;
}

async function globalUnban(api, userId) {
  for (const id of Object.keys(data.chats)) {
    try {
      await api.unbanChatMember(id, userId, { only_if_banned: true });
    } catch {}
  }
}

// ---------- Suivi des groupes ----------
bot.on("my_chat_member", (ctx) => {
  if (ctx.chat.type === "private") return;
  const st = ctx.myChatMember.new_chat_member.status;
  if (st === "member" || st === "administrator") {
    data.chats[ctx.chat.id] = ctx.chat.title || "";
  } else {
    delete data.chats[ctx.chat.id];
  }
  save();
});

// ---------- Nouveaux membres : blacklist, antibot (mute), welcome ----------
bot.on("message:new_chat_members", async (ctx) => {
  track(ctx);
  const adder = ctx.from;
  for (const u of ctx.msg.new_chat_members) {
    try {
      if (u.id === ctx.me.id) continue;

      if (data.bl.includes(u.id)) {
        await ctx.api.banChatMember(ctx.chat.id, u.id);
        continue;
      }

      if (u.is_bot) {
        await ctx.api.banChatMember(ctx.chat.id, u.id).catch(() => {});
        const status = await getStatus(ctx, adder.id);
        const exempt =
          adder.id === u.id ||
          status === "creator" ||
          data.whitelist.includes(adder.id);
        if (!exempt) {
          await ctx.api.restrictChatMember(ctx.chat.id, adder.id, {
            can_send_messages: false,
          });
          await ctx.reply(`🔇 ${adder.first_name} est mute (ajout de bot).`);
        }
        continue;
      }

      const w = data.welcome[ctx.chat.id];
      if (w) {
        await ctx.reply(
          w.replace(/\{name\}/g, u.first_name).replace(/\{chat\}/g, ctx.chat.title || "")
        );
      }
    } catch (e) {
      console.error("new member:", e.message);
    }
  }
});

// ---------- Modération : antilink, mots blacklist, slowmode, antispam/antiraid ----------
const LINK_RE =
  /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|\b[a-z0-9-]+\.(com|net|org|io|me|gg|xyz|ru|fr|co|app|link|ly)\b)/i;

function hasLink(msg) {
  const text = msg.text || msg.caption || "";
  const entities = msg.entities || msg.caption_entities || [];
  if (entities.some((e) => e.type === "url" || e.type === "text_link")) return true;
  return LINK_RE.test(text);
}

const history = new Map(); // spam
const lastMsg = new Map(); // slowmode

function checkSpam(ctx) {
  const key = `${ctx.chat.id}:${ctx.from.id}`;
  const now = Date.now();
  const h = history.get(key) || { times: [], last: "", dup: 0, strikes: 0 };
  h.times = h.times.filter((t) => now - t < 6000);
  h.times.push(now);
  const text = ctx.msg.text || ctx.msg.caption || "";
  h.dup = text && text === h.last ? h.dup + 1 : 0;
  h.last = text;
  const spam = h.times.length > 5 || h.dup >= 2;
  if (spam) h.strikes++;
  history.set(key, h);
  return { spam, strikes: h.strikes, key };
}

bot.on(["message", "edited_message"], async (ctx, next) => {
  if (ctx.chat.type === "private" || !ctx.from) return next();
  track(ctx);
  const edited = !!ctx.update.edited_message;

  try {
    if (data.bl.includes(ctx.from.id)) {
      await ctx.api.banChatMember(ctx.chat.id, ctx.from.id);
      await ctx.deleteMessage().catch(() => {});
      return;
    }

    if (await privileged(ctx)) return next();

    if (hasLink(ctx.msg)) {
      await ctx.deleteMessage();
      return;
    }

    const text = (ctx.msg.text || ctx.msg.caption || "").toLowerCase();
    const words = data.words[ctx.chat.id] || [];
    if (words.some((w) => text.includes(w))) {
      await ctx.deleteMessage();
      return;
    }

    if (!edited) {
      const s = data.slow[ctx.chat.id];
      if (s) {
        const key = `${ctx.chat.id}:${ctx.from.id}`;
        const now = Date.now();
        if (now - (lastMsg.get(key) || 0) < s * 1000) {
          await ctx.deleteMessage();
          return;
        }
        lastMsg.set(key, now);
      }

      const sp = checkSpam(ctx);
      if (sp.spam) {
        await ctx.deleteMessage().catch(() => {});
        if (sp.strikes >= 3 && data.antiraid[ctx.chat.id] !== false) {
          await kick(ctx, ctx.from.id);
          history.delete(sp.key);
          await ctx.reply(` ${ctx.from.first_name} a été kick (spam).`);
        }
        return;
      }
    }
  } catch (e) {
    console.error("modération:", e.message);
  }
  return next();
});

// ---------- Filtre des commandes : sans droit, le bot ne répond pas ----------
bot.on("message", async (ctx, next) => {
  const isCmd = ctx.msg.entities?.some((e) => e.type === "bot_command" && e.offset === 0);
  if (!isCmd) return next();
  if (ctx.chat.type === "private")
    return /^\/start\b/.test(ctx.msg.text) ? next() : undefined;
  if (await privileged(ctx)) return next();
  // sinon : on ignore en silence
});

// ---------- Commandes ----------
bot.command("start", (ctx) =>
  ctx.reply("Salut ! Merci de ton soutien ")
);

bot.command("ban", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /ban (en réponse, ou avec l'ID / @user)");
  if (await isAdmin(ctx, t.id)) return ctx.reply(" C'est un admin.");
  await ctx.api.banChatMember(ctx.chat.id, t.id);
  await ctx.reply(` ${t.name} banni.`);
}));

bot.command("unban", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /unban (en réponse, ou avec l'ID / @user)");
  await ctx.api.unbanChatMember(ctx.chat.id, t.id, { only_if_banned: true });
  await ctx.reply(` ${t.name} débanni.`);
}));

bot.command("mute", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /mute [durée] (ex : 30m, 2h, 1d)");
  if (await isAdmin(ctx, t.id)) return ctx.reply("❌ C'est un admin.");
  let opts = {};
  if (t.args[0]) {
    const secs = parseDuration(t.args[0]);
    if (!secs) return ctx.reply("❌ Durée invalide (ex : 30m, 2h, 1d).");
    opts = { until_date: Math.floor(Date.now() / 1000) + secs };
  }
  await ctx.api.restrictChatMember(ctx.chat.id, t.id, { can_send_messages: false }, opts);
  await ctx.reply(` ${t.name} mute${t.args[0] ? " " + t.args[0] : ""}.`);
}));

bot.command("unmute", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /unmute (en réponse, ou avec l'ID / @user)");
  await ctx.api.restrictChatMember(ctx.chat.id, t.id, ALL);
  await ctx.reply(` ${t.name} peut reparler.`);
}));

bot.command("lock", safe(async (ctx) => {
  await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: false });
  await ctx.reply(" Groupe verrouillé.");
}));

bot.command("unlock", safe(async (ctx) => {
  await ctx.api.setChatPermissions(ctx.chat.id, ALL);
  await ctx.reply(" Groupe déverrouillé.");
}));

bot.command("slowmode", safe(async (ctx) => {
  const n = parseInt(ctx.match, 10);
  if (isNaN(n) || n < 0) return ctx.reply("Usage : /slowmode <secondes> (0 = off)");
  if (n === 0) delete data.slow[ctx.chat.id];
  else data.slow[ctx.chat.id] = n;
  save();
  await ctx.reply(n ? ` Slowmode : ${n}s` : "Slowmode désactivé.");
}));

// Blacklist de mots
bot.command("blacklist", safe(async (ctx) => {
  const w = ctx.match.trim().toLowerCase();
  const list = (data.words[ctx.chat.id] ||= []);
  if (!w) return ctx.reply(list.length ? "Mots blacklistés :\n" + list.join(", ") : "Aucun mot blacklisté.");
  if (!list.includes(w)) list.push(w);
  save();
  await ctx.reply(` « ${w} » ajouté à la blacklist.`);
}));

bot.command("unblacklist", safe(async (ctx) => {
  const w = ctx.match.trim().toLowerCase();
  if (!w) return ctx.reply("Usage : /unblacklist <mot>");
  data.words[ctx.chat.id] = (data.words[ctx.chat.id] || []).filter((x) => x !== w);
  save();
  await ctx.reply(` « ${w} » retiré de la blacklist.`);
}));

// Blacklist de personnes (ban partout)
bot.command("bl", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /bl (en réponse, ou avec l'ID / @user)");
  if (await isAdmin(ctx, t.id)) return ctx.reply("❌ C'est un admin.");
  if (!data.bl.includes(t.id)) data.bl.push(t.id);
  save();
  const n = await globalBan(ctx.api, t.id);
  await ctx.reply(` ${t.name} blacklisté, banni de ${n} groupe(s).`);
}));

bot.command("unbl", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /unbl (en réponse, ou avec l'ID / @user)");
  data.bl = data.bl.filter((x) => x !== t.id);
  save();
  await globalUnban(ctx.api, t.id);
  await ctx.reply(` ${t.name} retiré de la blacklist.`);
}));

bot.command("antiraid", safe(async (ctx) => {
  const a = ctx.match.trim().toLowerCase();
  if (a !== "on" && a !== "off") return ctx.reply("Usage : /antiraid on|off");
  data.antiraid[ctx.chat.id] = a === "on";
  save();
  await ctx.reply(` Antiraid ${a}.`);
}));

// Whitelist : réservé aux vrais admins
bot.command("whitelist", safe(async (ctx) => {
  if (!(await isAdmin(ctx))) return;
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /whitelist (en réponse, ou avec l'ID / @user)");
  if (!data.whitelist.includes(t.id)) data.whitelist.push(t.id);
  save();
  await ctx.reply(` ${t.name} whitelisté.`);
}));

bot.command("unwhitelist", safe(async (ctx) => {
  if (!(await isAdmin(ctx))) return;
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /unwhitelist (en réponse, ou avec l'ID / @user)");
  data.whitelist = data.whitelist.filter((x) => x !== t.id);
  save();
  await ctx.reply(` ${t.name} retiré de la whitelist.`);
}));

bot.command("welcome", safe(async (ctx) => {
  const txt = ctx.match.trim();
  if (!txt) return ctx.reply("Usage : /welcome <texte> ({name}, {chat}) ou /welcome off");
  if (txt.toLowerCase() === "off") delete data.welcome[ctx.chat.id];
  else data.welcome[ctx.chat.id] = txt;
  save();
  await ctx.reply(txt.toLowerCase() === "off" ? "Welcome désactivé." : " Welcome enregistré.");
}));

bot.command("rank", safe(async (ctx) => {
  const t = getTarget(ctx);
  const title = t?.args.join(" ").slice(0, 16);
  if (!t || !title) return ctx.reply("Usage : /rank <rôle> (en réponse, ou avec l'ID / @user)");
  await ctx.api.promoteChatMember(ctx.chat.id, t.id, { can_manage_chat: true });
  await ctx.api.setChatAdministratorCustomTitle(ctx.chat.id, t.id, title);
  await ctx.reply(` ${t.name} a maintenant le rôle « ${title} »`);
}));

bot.command("unrank", safe(async (ctx) => {
  const t = getTarget(ctx);
  if (!t) return ctx.reply("Usage : /unrank (en réponse, ou avec l'ID / @user)");
  await ctx.api.promoteChatMember(ctx.chat.id, t.id, {
    can_manage_chat: false,
    can_change_info: false,
    can_delete_messages: false,
    can_invite_users: false,
    can_restrict_members: false,
    can_pin_messages: false,
    can_promote_members: false,
    can_manage_video_chats: false,
  });
  await ctx.reply(` Rôle de ${t.name} retiré.`);
}));

bot.command("info", safe(async (ctx) => {
  const t = getTarget(ctx) || { id: ctx.from.id };
  const m = await ctx.api.getChatMember(ctx.chat.id, t.id);
  const u = m.user;
  await ctx.reply(
    [
      ` ${u.first_name} ${u.last_name || ""}`.trim(),
      u.username ? `@${u.username}` : "Pas de username",
      `ID : ${u.id}`,
      `Statut : ${m.status}`,
      `Whitelist : ${data.whitelist.includes(u.id) ? "oui" : "non"}`,
      `Blacklist : ${data.bl.includes(u.id) ? "oui" : "non"}`,
    ].join("\n")
  );
}));

bot.command("clear", safe(async (ctx) => {
  const n = parseInt(ctx.match, 10);
  if (!n || n < 1 || n > 99) return ctx.reply("Usage : /clear <1-99>");
  const last = ctx.msg.message_id;
  const ids = Array.from({ length: n + 1 }, (_, i) => last - i).filter((id) => id > 0);
  await ctx.api.deleteMessages(ctx.chat.id, ids);
}));

// ---------- Boost : message privé ----------
bot.on("chat_boost", async (ctx) => {
  const user = ctx.chatBoost.boost.source?.user;
  if (!user) return;
  try {
    await ctx.api.sendMessage(user.id, BOOST_MSG);
  } catch (e) {
    console.error("DM boost impossible (l'user doit d'abord /start le bot):", e.message);
  }
});

bot.catch((err) => console.error("Erreur:", err.message));

bot.start({
  allowed_updates: ["message", "edited_message", "chat_boost", "my_chat_member"],
});
console.log("Bot démarré");
