import { Bot, InlineKeyboard } from "grammy";

// ================= CONFIG =================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 8987678726;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN Environment Variable Missing!");
}

const bot = new Bot(BOT_TOKEN);

// ================= CHANNELS =================

const CHANNELS = [
  {
    id: "-1003942790406",
    link: "https://t.me/+25wehwsKm4RlNTU1",
    name: "Channel 1"
  },
  {
    id: "-1003795704373",
    link: "https://t.me/+OHBkjRv0udI4MzNl",
    name: "Channel 2"
  },
  {
    id: "-1004478369059",
    link: "https://t.me/+k31Nqng40Pc3ZThl",
    name: "Channel 3"
  },
  {
    id: "-1003860473624",
    link: "https://t.me/+RwHmeJ0mV1tiNzVl",
    name: "Channel 4"
  }
];

// Image source message
const IMAGE_CHANNEL = "@fghhbbbnj";
const IMAGE_MESSAGE_ID = 87;

// ================= DATABASE =================

// Temporary memory storage
const users = new Map();

// ================= KEYBOARDS =================

function mainMenu() {
  return new InlineKeyboard()
    .text("📢 JOIN CHANNELS", "join_channels")
    .row()
    .text("🎁 REWARDS", "rewards")
    .row()
    .text("👤 SUPPORT", "support");
}

function channelKeyboard(notJoined) {
  const keyboard = new InlineKeyboard();

  for (let i = 0; i < notJoined.length; i += 2) {
    keyboard.url("📢 Join " + notJoined[i].name, notJoined[i].link);

    if (notJoined[i + 1]) {
      keyboard.url(
        "📢 Join " + notJoined[i + 1].name,
        notJoined[i + 1].link
      );
    }

    keyboard.row();
  }

  keyboard.text("🔐 VERIFY & CLAIM", "verify");

  return keyboard;
}

// ================= USER DATA =================

function getUser(id) {
  if (!users.has(id)) {
    users.set(id, {
      claimed: false
    });
  }

  return users.get(id);
}

// ================= CHECK MEMBERSHIP =================

async function checkChannels(userId) {
  const notJoined = [];

  for (const channel of CHANNELS) {
    try {
      const member = await bot.api.getChatMember(
        channel.id,
        userId
      );

      const joined =
        ["creator", "administrator", "member"].includes(member.status) ||
        (member.status === "restricted" && member.is_member);

      if (!joined) {
        notJoined.push(channel);
      }

    } catch (error) {
      console.error(
        "Channel check failed:",
        channel.name,
        error.message
      );

      notJoined.push(channel);
    }
  }

  return notJoined;
}

// ================= START =================

bot.command("start", async (ctx) => {
  const userId = ctx.from.id;

  getUser(userId);

  try {
    await bot.api.copyMessage(
      ctx.chat.id,
      IMAGE_CHANNEL,
      IMAGE_MESSAGE_ID
    );
  } catch (error) {
    console.log("Welcome image unavailable:", error.message);
  }

  const notJoined = await checkChannels(userId);

  if (notJoined.length === 0) {
    return ctx.reply(
      "🎉 WELCOME!\n\n" +
      "✅ All channels already joined.\n\n" +
      "Choose an option below:",
      { reply_markup: mainMenu() }
    );
  }

  await ctx.reply(
    "👑 <b>WELCOME TO PREMIUM REWARD BOT</b>\n\n" +
    "🎁 Join all our Telegram channels.\n\n" +
    "🔒 Complete verification to unlock your reward.\n\n" +
    "👇 Join all channels below:",
    {
      parse_mode: "HTML",
      reply_markup: channelKeyboard(notJoined)
    }
  );
});

// ================= JOIN CHANNELS =================

bot.callbackQuery("join_channels", async (ctx) => {
  const notJoined = await checkChannels(ctx.from.id);

  if (notJoined.length === 0) {
    await ctx.answerCallbackQuery("All channels joined!");
    return ctx.editMessageText(
      "🎉 All channels joined successfully!",
      { reply_markup: mainMenu() }
    );
  }

  await ctx.answerCallbackQuery("Join remaining channels.");

  await ctx.editMessageReplyMarkup({
    reply_markup: channelKeyboard(notJoined)
  });
});

// ================= VERIFY =================

bot.callbackQuery("verify", async (ctx) => {
  await ctx.answerCallbackQuery("Checking membership...");

  const notJoined = await checkChannels(ctx.from.id);

  if (notJoined.length > 0) {
    return ctx.reply(
      "❌ Verification Failed!\n\n" +
      "Please join all remaining channels first.",
      {
        reply_markup: channelKeyboard(notJoined)
      }
    );
  }

  await ctx.reply(
    "✅ <b>VERIFICATION SUCCESSFUL!</b>\n\n" +
    "🎉 You have joined all 4 channels.\n\n" +
    "Your reward section is now unlocked.",
    {
      parse_mode: "HTML",
      reply_markup: mainMenu()
    }
  );
});

// ================= REWARDS =================

bot.callbackQuery("rewards", async (ctx) => {
  const notJoined = await checkChannels(ctx.from.id);

  if (notJoined.length > 0) {
    await ctx.answerCallbackQuery(
      "Join all channels first!",
      { show_alert: true }
    );
    return;
  }

  const user = getUser(ctx.from.id);

  if (user.claimed) {
    return ctx.reply("🎁 Your demo reward was already claimed.");
  }

  const keyboard = new InlineKeyboard()
    .text("🎁 CLAIM DEMO REWARD ₹10", "claim_reward");

  await ctx.reply(
    "🎉 <b>REWARD UNLOCKED!</b>\n\n" +
    "🎁 Demo Reward: ₹10\n\n" +
    "Press below to claim your demo reward.",
    {
      parse_mode: "HTML",
      reply_markup: keyboard
    }
  );
});

// ================= CLAIM =================

bot.callbackQuery("claim_reward", async (ctx) => {
  const notJoined = await checkChannels(ctx.from.id);

  if (notJoined.length > 0) {
    return ctx.answerCallbackQuery({
      text: "Join all channels first!",
      show_alert: true
    });
  }

  const user = getUser(ctx.from.id);

  if (user.claimed) {
    return ctx.answerCallbackQuery({
      text: "Already claimed!",
      show_alert: true
    });
  }

  user.claimed = true;

  await ctx.answerCallbackQuery("Demo reward claimed!");

  await ctx.reply(
    "🎉 <b>CONGRATULATIONS!</b>\n\n" +
    "✅ Your ₹10 demo reward has been claimed.\n\n" +
    "This is a demo confirmation, not a cash payment.",
    {
      parse_mode: "HTML",
      reply_markup: mainMenu()
    }
  );
});

// ================= SUPPORT =================

bot.callbackQuery("support", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.reply(
    "👤 SUPPORT\n\n" +
    "For help, contact the bot administrator."
  );
});

// ================= ADMIN PANEL =================

bot.command("admin", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("⛔ Access Denied!");
  }

  const keyboard = new InlineKeyboard()
    .text("📊 BOT STATISTICS", "admin_stats");

  await ctx.reply(
    "👑 <b>ADMIN PANEL</b>\n\n" +
    "Welcome Administrator!",
    {
      parse_mode: "HTML",
      reply_markup: keyboard
    }
  );
});

// ================= ADMIN STATS =================

bot.callbackQuery("admin_stats", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.answerCallbackQuery({
      text: "Access Denied!",
      show_alert: true
    });
  }

  let claimed = 0;

  for (const user of users.values()) {
    if (user.claimed) claimed++;
  }

  await ctx.answerCallbackQuery();

  await ctx.reply(
    "📊 BOT STATISTICS\n\n" +
    "👥 Total Users: " + users.size + "\n" +
    "🎁 Demo Claims: " + claimed
  );
});

// ================= ERROR HANDLER =================

bot.catch((error) => {
  console.error("BOT ERROR:", error);
});

// ================= START BOT =================

console.log("Premium Telegram Bot Starting...");

bot.start({
  onStart: (info) => {
    console.log("BOT RUNNING:", info.username);
  }
});
