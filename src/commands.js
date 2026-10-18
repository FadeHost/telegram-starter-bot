
const { InlineKeyboard } = require("grammy");

const userData = new Map();
const waiting = new Map();

const questions = {
  mathematics: [
    { q: "What is 178 + 20?", a: ["198", "188", "208"], correct: "198" },
    { q: "What is 79 - 29?", a: ["40", "50", "60"], correct: "50" },
    { q: "What is 9 × 9?", a: ["72", "81", "99"], correct: "81" },
    { q: "What is 100 ÷ 2?", a: ["25", "50", "75"], correct: "50" },
    { q: "What is 7 × 3?", a: ["21", "24", "18"], correct: "21" }
  ],
  flag: [
    { q: "Which country has this flag? 🇯🇵", a: ["Japan", "China", "Brazil"], correct: "Japan" },
    { q: "Which country has this flag? 🇵🇭", a: ["Korea", "Philippines", "Japan"], correct: "Philippines" },
    { q: "Which country has this flag? 🇧🇷", a: ["Brazil", "China", "Japan"], correct: "Brazil" },
    { q: "Which country has this flag? 🇨🇳", a: ["China", "Brazil", "Korea"], correct: "China" },
    { q: "Which country has this flag? 🇰🇷", a: ["Japan", "Korea", "Philippines"], correct: "Korea" }
  ],
  color: [
    { q: "Which color is this? 🔴", a: ["Blue", "Red", "Yellow"], correct: "Red" },
    { q: "Which color is this? 🔵", a: ["Blue", "Orange", "Purple"], correct: "Blue" },
    { q: "Which color is this? 🟡", a: ["Yellow", "Red", "Green"], correct: "Yellow" },
    { q: "Which color is this? 🟣", a: ["Purple", "Blue", "Orange"], correct: "Purple" },
    { q: "Which color is this? 🟠", a: ["Red", "Orange", "Yellow"], correct: "Orange" }
  ]
};

function getUser(id) {
  if (!userData.has(id)) {
    userData.set(id, { points: 0, welcomed: false, category: null, index: 0 });
  }
  return userData.get(id);
}

function mainMenu() {
  return new InlineKeyboard()
    .text("📚 CATEGORY", "category").row()
    .text("👤 MY PROFILE", "profile").row()
    .text("💰 ENCASHMENT", "encashment");
}

function categoryMenu() {
  return new InlineKeyboard()
    .text("➗ Mathematics", "quiz_mathematics").row()
    .text("🏳️ Guess the Flag", "quiz_flag").row()
    .text("🎨 Guess the Color", "quiz_color").row()
    .text("⬅️ Main Menu", "main");
}

function answerKeyboard(list) {
  const keyboard = new InlineKeyboard();
  for (const answer of list) keyboard.text(answer, `answer_${answer}`).row();
  return keyboard;
}

function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    const user = getUser(ctx.from.id);

    if (!user.welcomed) {
      user.points += 20;
      user.welcomed = true;
    }

    await ctx.reply(
      `👑 WELCOME TO EDA – DIGITAL ACADEMY 👑\n\nYour Points: ${user.points}`,
      { reply_markup: mainMenu() }
    );
  });

  bot.command("menu", async (ctx) => {
    await ctx.reply("👑 MAIN MENU", { reply_markup: mainMenu() });
  });

  bot.callbackQuery("main", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("👑 MAIN MENU", { reply_markup: mainMenu() });
  });

  bot.callbackQuery("category", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("📚 SELECT CATEGORY", { reply_markup: categoryMenu() });
  });

  bot.callbackQuery("profile", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = getUser(ctx.from.id);
    await ctx.reply(
      `👤 MY PROFILE\n\nUsername: @${ctx.from.username || "Not set"}\nCurrent Points: ${user.points}`
    );
  });

  bot.callbackQuery("encashment", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "💰 ENCASHMENT\n\n10,000 points = ₱500\n15,000 points = ₱1,000\n\nPlease contact the administrator to submit a request."
    );
  });

  for (const category of Object.keys(questions)) {
    bot.callbackQuery(`quiz_${category}`, async (ctx) => {
      await ctx.answerCallbackQuery();

      const id = ctx.from.id;
      const user = getUser(id);

      if (waiting.has(id)) {
        return ctx.reply("⏳ Please wait for your current round to finish.");
      }

      user.category = category;
      user.index = 0;
      await sendQuestion(ctx, user, id);
    });
  }

  async function sendQuestion(ctx, user, id) {
    const list = questions[user.category];
    const item = list[user.index % list.length];

    await ctx.reply(
      `📚 ${user.category.toUpperCase()}\n\n${item.q}\n\nCurrent Points: ${user.points}`,
      { reply_markup: answerKeyboard(item.a) }
    );
  }

  bot.callbackQuery(/^answer_(.+)$/, async (ctx) => {
    const id = ctx.from.id;
    const user = getUser(id);
    const answer = ctx.match[1];

    await ctx.answerCallbackQuery();

    if (!user.category) {
      return ctx.reply("Please select a category first.");
    }

    if (waiting.has(id)) {
      return ctx.reply("⏳ Your 40-second countdown is active.");
    }

    const list = questions[user.category];
    const item = list[user.index % list.length];

    if (!item) return;

    if (answer === item.correct) {
      user.points += 5;
      await ctx.reply(`✅ Correct!\n+5 points\nYour Points: ${user.points}`);
    } else {
      await ctx.reply(`❌ Incorrect!\nCorrect answer: ${item.correct}\nYour Points: ${user.points}`);
    }

    user.index++;

    // Start the 40-second wait only after the answer.
    waiting.set(id, true);

    // 40-second countdown runs silently

    setTimeout(async () => {
      waiting.delete(id);
      try {
        await sendQuestion(ctx, user, id);
      } catch (error) {
        console.error("Could not send next question:", error);
      }
    }, 40000);
  });
}

module.exports = { registerCommands };
                    
