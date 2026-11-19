const http = require("http");
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const ADMIN_ID = 8987678726;
const WELCOME_IMAGE = "https://t.me/fghhbbbnj/87";

const CHANNELS = [
  { name: "Channel 1", url: "https://t.me/+25wehwsKm4RlNTU1", id: -1003942790406 },
  { name: "Channel 2", url: "https://t.me/+OHBkjRv0udI4MzNl", id: -1003795704373 },
  { name: "Channel 3", url: "https://t.me/+k31Nqng40Pc3ZThl", id: -1004478369059 },
  { name: "Channel 4", url: "https://t.me/+RwHmeJ0mV1tiNzVl", id: -1003860473624 }
];

// Render Web Service को तुरंत "Live" दिखाने के लिए पोर्ट सर्वर
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is Live!");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

const bot = new TelegramBot(token, { polling: true });
const joinRequests = {}; // यूजर की जॉइन रिक्वेस्ट ट्रैक करने के लिए

// जब कोई यूजर 4 चैनल्स में से किसी पर Join Request भेजेगा
bot.on("chat_join_request", (req) => {
  const userId = req.from.id;
  const chatId = req.chat.id;
  if (!joinRequests[userId]) joinRequests[userId] = new Set();
  joinRequests[userId].add(chatId);
});

function getJoinKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📢 Channel 1", url: CHANNELS[0].url },
        { text: "📢 Channel 2", url: CHANNELS[1].url }
      ],
      [
        { text: "📢 Channel 3", url: CHANNELS[2].url },
        { text: "📢 Channel 4", url: CHANNELS[3].url }
      ],
      [{ text: "🔵 Continue ➡️", callback_data: "check_join" }]
    ]
  };
}

function getMainMenu(userId) {
  const keyboard = [
    [
      { text: "🎁 Daily Bonus", callback_data: "bonus" },
      { text: "🔥 Offers", callback_data: "offers" }
    ],
    [
      { text: "🔗 Refer & Earn", callback_data: "refer" },
      { text: "📊 Stats", callback_data: "stats" }
    ]
  ];
  if (userId === ADMIN_ID) {
    keyboard.push([{ text: "🔴 Broadcast (Admin)", callback_data: "broadcast" }]);
  }
  return { inline_keyboard: keyboard };
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const caption =
    "<b>👋 स्वागत है!</b>\n\n" +
    "आगे बढ़ने के लिए नीचे दिए गए सभी <b>4 चैनल्स</b> पर जॉइन रिक्वेस्ट भेजें और फिर <b>Continue</b> पर क्लिक करें:";

  bot.sendPhoto(chatId, WELCOME_IMAGE, {
    caption: caption,
    parse_mode: "HTML",
    reply_markup: getJoinKeyboard()
  });
});

bot.on("callback_query", async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;

  if (query.data === "check_join") {
    const userReqs = joinRequests[userId] || new Set();
    const allRequested = CHANNELS.every((ch) => userReqs.has(ch.id));

    if (!allRequested) {
      return bot.answerCallbackQuery(query.id, {
        text: "⚠️ पहले सभी 4 चैनल्स पर Join Request भेजें!",
        show_alert: true
      });
    }

    await bot.answerCallbackQuery(query.id, { text: "✅ वेरिफिकेशन पूरा हुआ!" });
    bot.sendMessage(chatId, "<b>🎉 Main Menu</b>\n\nनीचे दिए गए विकल्पों में से चुनें:", {
      parse_mode: "HTML",
      reply_markup: getMainMenu(userId)
    });
  } else if (query.data === "bonus") {
    bot.answerCallbackQuery(query.id, { text: "🎁 आपको आज का बोनस मिल गया है!", show_alert: true });
  } else if (query.data === "offers") {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, "🔥 <b>नए ऑफर्स जल्द आ रहे हैं!</b>", { parse_mode: "HTML" });
  } else if (query.data === "refer") {
    bot.answerCallbackQuery(query.id);
    const me = await bot.getMe();
    bot.sendMessage(
      chatId,
      `🔗 <b>आपका रेफरल लिंक:</b>\nhttps://t.me/${me.username}?start=${userId}`,
      { parse_mode: "HTML" }
    );
  } else if (query.data === "stats") {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, "📊 <b>आपका बैलेंस:</b> ₹0", { parse_mode: "HTML" });
  } else if (query.data === "broadcast" && userId === ADMIN_ID) {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, "🔴 ब्रॉडकास्ट करने के लिए अपना मैसेज भेजें।");
  }
});
