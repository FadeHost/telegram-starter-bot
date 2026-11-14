
const { InlineKeyboard } = require("grammy");
const fs = require("fs");
const path = require("path");

// ================= CONFIG =================

const CONFIG = {
  BOT_USERNAME: "MahanRewardsBot",
  CHANNEL: "@MahanRewardsChannel",
  CHANNEL_URL: "https://t.me/MahanRewardsChannel",

  OWNER_ID: Number(process.env.OWNER_ID || 0),

  DAILY_POINTS: 5,
  TASK_POINTS: 20,
  REFERRAL_POINTS: 30,

  REWARDS: [
    { id: "stars15", title: "15 Telegram Stars", cost: 1000 },
    { id: "stars25", title: "25 Telegram Stars", cost: 1800 },
    { id: "stars50", title: "50 Telegram Stars", cost: 3500 },
    { id: "gift", title: "Telegram Gift", cost: 5000 }
  ]
};

const ADMIN_IDS = new Set(
  (process.env.ADMIN_IDS || "")
    .split(",")
    .map(x => Number(x.trim()))
    .filter(Boolean)
);

if (CONFIG.OWNER_ID) ADMIN_IDS.add(CONFIG.OWNER_ID);

// ================= DATABASE =================

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "mahan-rewards.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function emptyDB() {
  return {
    users: {},
    requests: [],
    logs: [],
    nextRequestId: 1
  };
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return emptyDB();

  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    throw new Error("Database file is damaged: " + err.message);
  }
}

let db = loadDB();

function saveDB() {
  const temp = DB_FILE + ".tmp";

  fs.writeFileSync(
    temp,
    JSON.stringify(db, null, 2),
    "utf8"
  );

  fs.renameSync(temp, DB_FILE);
}

function log(action, userId, details = "") {
  db.logs.push({
    action,
    userId: String(userId),
    details,
    date: new Date().toISOString()
  });

  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(-1000);
  }

  saveDB();
}

// ================= HELPERS =================

function getUser(id) {
  return db.users[String(id)];
}

function isAdmin(id) {
  return ADMIN_IDS.has(Number(id));
}

function createUser(ctx, referrerId = null) {
  const id = String(ctx.from.id);

  if (db.users[id]) return false;

  if (
    referrerId &&
    String(referrerId) !== id &&
    db.users[String(referrerId)]
  ) {
    referrerId = String(referrerId);
  } else {
    referrerId = null;
  }

  db.users[id] = {
    id,
    name: ctx.from.first_name || "User",
    username: ctx.from.username || "",
    points: 0,
    joinedAt: new Date().toISOString(),
    lastDaily: null,
    channelTaskDone: false,
    referral: referrerId,
    referralProcessed: false,
    referrals: 0,
    history: [],
    quizDone: []
  };

  saveDB();
  log("new_user", id);

  return true;
}

function addPoints(userId, amount, reason) {
  const user = getUser(userId);

  if (!user || amount <= 0) return false;

  user.points += amount;

  user.history.push({
    amount,
    reason,
    date: new Date().toISOString()
  });

  if (user.history.length > 100) {
    user.history = user.history.slice(-100);
  }

  saveDB();
  log("points_added", userId, `${amount}: ${reason}`);

  return true;
}

function removePoints(userId, amount, reason) {
  const user = getUser(userId);

  if (!user || amount <= 0 || user.points < amount) {
    return false;
  }

  user.points -= amount;

  user.history.push({
    amount: -amount,
    reason,
    date: new Date().toISOString()
  });

  saveDB();
  log("points_removed", userId, `${amount}: ${reason}`);

  return true;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mainMenu() {
  return new InlineKeyboard()
    .text("👤 پروفایل", "profile")
    .text("💰 کیف پول", "wallet")
    .row()
    .text("🎁 فروشگاه جوایز", "shop")
    .text("📋 مأموریت‌ها", "tasks")
    .row()
    .text("🎮 بازی و رقابت", "games")
    .text("🏆 رتبه‌بندی", "leaderboard")
    .row()
    .text("🎯 پاداش روزانه", "daily")
    .text("👥 دعوت دوستان", "invite")
    .row()
    .text("📜 تاریخچه", "history")
    .text("📩 پشتیبانی", "support")
    .row()
    .url("📢 کانال رسمی", CONFIG.CHANNEL_URL);
}

async function checkMember(ctx) {
  try {
    const member = await ctx.api.getChatMember(
      CONFIG.CHANNEL,
      ctx.from.id
    );

    return [
      "member",
      "administrator",
      "creator"
    ].includes(member.status);
  } catch (err) {
    console.error("Membership check error:", err.message);
    return false;
  }
}

async function showJoin(ctx) {
  const keyboard = new InlineKeyboard()
    .url("عضویت در کانال", CONFIG.CHANNEL_URL)
    .row()
    .text("بررسی عضویت", "check_member");

  const text =
    "برای استفاده از ربات ابتدا در کانال رسمی عضو شو.\n\n" +
    "بعد از عضویت روی دکمه بررسی عضویت بزن.";

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      reply_markup: keyboard
    }).catch(() => {});
  } else {
    await ctx.reply(text, {
      reply_markup: keyboard
    });
  }
}

async function gate(ctx) {
  if (isAdmin(ctx.from.id)) return true;

  const member = await checkMember(ctx);

  if (!member) {
    await showJoin(ctx);
    return false;
  }

  const user = getUser(ctx.from.id);

  if (user && user.referral && !user.referralProcessed) {
    const referrer = getUser(user.referral);

    if (referrer) {
      user.referralProcessed = true;
      referrer.referrals += 1;

      addPoints(
        referrer.id,
        CONFIG.REFERRAL_POINTS,
        "Valid referral"
      );

      saveDB();

      ctx.api.sendMessage(
        referrer.id,
        `🎉 یک دعوت معتبر ثبت شد!\n${CONFIG.REFERRAL_POINTS} امتیاز دریافت کردی.`
      ).catch(() => {});
    }
  }

  return true;
}

async function sendMenu(ctx) {
  await ctx.reply(
    "به ربات MAHAN REWARDS خوش آمدی.\n\nاز منوی زیر استفاده کن:",
    { reply_markup: mainMenu() }
  );
}

// ================= START =================

function registerCommands(bot) {
  const waiting = new Map();

  bot.command("start", async ctx => {
    const payload = ctx.match ? ctx.match.trim() : "";

    let referrer = null;

    if (payload.startsWith("ref_")) {
      const id = payload.slice(4);

      if (/^\d+$/.test(id)) {
        referrer = id;
      }
    }

    createUser(ctx, referrer);

    if (!(await gate(ctx))) return;

    await sendMenu(ctx);
  });

  bot.command("cancel", async ctx => {
    waiting.delete(String(ctx.from.id));

    await ctx.reply("عملیات لغو شد.");
  });

  bot.command("admin", async ctx => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply("شما دسترسی مدیریت ندارید.");
    }

    await showAdmin(ctx);
  });

  // ================= MEMBERSHIP =================

  bot.callbackQuery("check_member", async ctx => {
    const member = await checkMember(ctx);

    if (!member) {
      await ctx.answerCallbackQuery({
        text: "هنوز عضویت شما تأیید نشده است.",
        show_alert: true
      });
      return;
    }

    const user = getUser(ctx.from.id);

    if (user && user.referral && !user.referralProcessed) {
      const referrer = getUser(user.referral);

      if (referrer) {
        user.referralProcessed = true;
        referrer.referrals += 1;

        addPoints(
          referrer.id,
          CONFIG.REFERRAL_POINTS,
          "Valid referral"
        );
      }
    }

    await ctx.answerCallbackQuery("عضویت تأیید شد.");

    await ctx.editMessageText(
      "عضویت شما تأیید شد. از منوی زیر استفاده کن:",
      { reply_markup: mainMenu() }
    ).catch(() => {});
  });

  // ================= MAIN CALLBACKS =================

  bot.on("callback_query:data", async ctx => {
    const data = ctx.callbackQuery.data;

    if (data === "check_member") return;

    if (data.startsWith("admin_")) {
      if (!isAdmin(ctx.from.id)) {
        return ctx.answerCallbackQuery({
          text: "دسترسی غیرمجاز",
          show_alert: true
        });
      }

      return;
    }

    if (!(await gate(ctx))) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    const user = getUser(ctx.from.id);

    if (!user) {
      return ctx.answerCallbackQuery("ابتدا /start را بزن.");
    }

    await ctx.answerCallbackQuery().catch(() => {});

    // PROFILE
    if (data === "profile") {
      return ctx.reply(
        `👤 پروفایل شما\n\n` +
        `نام: ${user.name}\n` +
        `شناسه: ${user.id}\n` +
        `امتیاز: ${user.points}\n` +
        `دعوت‌ها: ${user.referrals}`
      );
    }

    // WALLET
    if (data === "wallet") {
      return ctx.reply(
        `💰 کیف پول\n\nموجودی شما: ${user.points} امتیاز`
      );
    }

    // DAILY
    if (data === "daily") {
      if (user.lastDaily === today()) {
        return ctx.reply(
          "پاداش امروز را قبلاً دریافت کرده‌ای."
        );
      }

      user.lastDaily = today();

      addPoints(
        user.id,
        CONFIG.DAILY_POINTS,
        "Daily reward"
      );

      return ctx.reply(
        `🎯 پاداش روزانه دریافت شد!\n${CONFIG.DAILY_POINTS} امتیاز به کیف پول اضافه شد.`
      );
    }

    // TASKS
    if (data === "tasks") {
      const keyboard = new InlineKeyboard()
        .text("انجام مأموریت عضویت", "channel_task")
        .row()
        .text("بازگشت", "back");

      return ctx.reply(
        "📋 مأموریت‌های فعال\n\n" +
        `عضویت در کانال رسمی: ${CONFIG.TASK_POINTS} امتیاز\n\n` +
        "برای دریافت امتیاز روی دکمه زیر بزن.",
        { reply_markup: keyboard }
      );
    }

    if (data === "channel_task") {
      if (user.channelTaskDone) {
        return ctx.reply(
          "این مأموریت را قبلاً انجام داده‌ای."
        );
      }

      if (!(await checkMember(ctx))) {
        return showJoin(ctx);
      }

      user.channelTaskDone = true;

      addPoints(
        user.id,
        CONFIG.TASK_POINTS,
        "Channel membership task"
      );

      return ctx.reply(
        `مأموریت تکمیل شد!\n${CONFIG.TASK_POINTS} امتیاز دریافت کردی.`
      );
    }

    // INVITE
    if (data === "invite") {
      const link =
        `https://t.me/${CONFIG.BOT_USERNAME}?start=ref_${user.id}`;

      return ctx.reply(
        "👥 دعوت دوستان\n\n" +
        "لینک اختصاصی تو:\n" +
        link +
        "\n\n" +
        `با هر دعوت معتبر ${CONFIG.REFERRAL_POINTS} امتیاز می‌گیری.\n` +
        "دعوت فقط زمانی معتبر است که کاربر جدید باشد و عضویت کانال او تأیید شود."
      );
    }

    // LEADERBOARD
    if (data === "leaderboard") {
      const top = Object.values(db.users)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

      let text = "🏆 جدول رتبه‌بندی\n\n";

      top.forEach((u, i) => {
        text += `${i + 1}. ${u.name} | ${u.points} امتیاز\n`;
      });

      return ctx.reply(text);
    }

    // HISTORY
    if (data === "history") {
      const history = user.history.slice(-10).reverse();

      if (!history.length) {
        return ctx.reply("هنوز تراکنشی ثبت نشده است.");
      }

      let text = "📜 آخرین تراکنش‌ها\n\n";

      history.forEach(item => {
        const sign = item.amount > 0 ? "+" : "";

        text +=
          `${sign}${item.amount} امتیاز | ${item.reason}\n`;
      });

      return ctx.reply(text);
    }

    // SHOP
    if (data === "shop") {
      const keyboard = new InlineKeyboard();

      CONFIG.REWARDS.forEach(reward => {
        keyboard.text(
          `${reward.title} | ${reward.cost} امتیاز`,
          `buy_${reward.id}`
        ).row();
      });

      keyboard.text("بازگشت", "back");

      return ctx.reply(
        "🎁 فروشگاه جوایز\n\n" +
        "برای ثبت درخواست، جایزه موردنظر را انتخاب کن.\n" +
        "تحویل جایزه پس از بررسی و تأیید مدیریت انجام می‌شود.",
        { reply_markup: keyboard }
      );
    }

    // BUY
    if (data.startsWith("buy_")) {
      const rewardId = data.slice(4);

      const reward = CONFIG.REWARDS.find(
        r => r.id === rewardId
      );

      if (!reward) return ctx.reply("جایزه معتبر نیست.");

      const pending = db.requests.find(
        r =>
          r.userId === user.id &&
          r.status === "pending"
      );

      if (pending) {
        return ctx.reply(
          "شما یک درخواست در حال بررسی دارید."
        );
      }

      if (!removePoints(
        user.id,
        reward.cost,
        "Reward request: " + reward.title
      )) {
        return ctx.reply("امتیاز کافی نداری.");
      }

      const request = {
        id: db.nextRequestId++,
        userId: user.id,
        rewardId: reward.id,
        rewardTitle: reward.title,
        cost: reward.cost,
        status: "pending",
        date: new Date().toISOString()
      };

      db.requests.push(request);
      saveDB();

      for (const adminId of ADMIN_IDS) {
        const keyboard = new InlineKeyboard()
          .text("تأیید", `admin_approve_${request.id}`)
          .text("رد", `admin_reject_${request.id}`);

        ctx.api.sendMessage(
          adminId,
          `📥 درخواست جایزه جدید\n\n` +
          `شماره: ${request.id}\n` +
          `کاربر: ${user.id}\n` +
          `جایزه: ${reward.title}\n` +
          `هزینه: ${reward.cost} امتیاز`,
          { reply_markup: keyboard }
        ).catch(() => {});
      }

      return ctx.reply(
        `درخواست شما ثبت شد.\nشماره درخواست: ${request.id}\n\nپس از بررسی مدیریت نتیجه اعلام می‌شود.`
      );
    }

    // GAMES
    if (data === "games") {
      const keyboard = new InlineKeyboard()
        .text("🧠 مسابقه اطلاعات عمومی", "quiz")
        .row()
        .text("🔮 پیش‌بینی تفریحی", "prediction")
        .row()
        .text("بازگشت", "back");

      return ctx.reply(
        "🎮 بخش بازی و رقابت\n\n" +
        "در این بخش می‌توانی بدون شرط‌بندی و بدون به خطر انداختن امتیازها رقابت کنی.",
        { reply_markup: keyboard }
      );
    }

    // QUIZ
    if (data === "quiz") {
      const questions = [
        {
          id: "q1",
          question: "پایتخت ژاپن کدام شهر است؟",
          answers: ["توکیو", "سئول", "پکن"],
          correct: 0
        },
        {
          id: "q2",
          question: "بزرگ‌ترین سیاره منظومه شمسی کدام است؟",
          answers: ["زمین", "مشتری", "مریخ"],
          correct: 1
        },
        {
          id: "q3",
          question: "عدد 12 ضربدر 8 چند می‌شود؟",
          answers: ["86", "96", "108"],
          correct: 1
        }
      ];

      const available = questions.filter(
        q => !user.quizDone.includes(q.id)
      );

      if (!available.length) {
        return ctx.reply(
          "تمام سؤال‌های فعلی را پاسخ داده‌ای. بعداً سؤال‌های جدید اضافه می‌شوند."
        );
      }

      const q = available[
        Math.floor(Math.random() * available.length)
      ];

      const keyboard = new InlineKeyboard();

      q.answers.forEach((answer, i) => {
        keyboard.text(
          answer,
          `answer_${q.id}_${i}`
        ).row();
      });

      return ctx.reply(
        `🧠 سؤال مسابقه\n\n${q.question}\n\n` +
        "برای هر سؤال فقط یک بار فرصت پاسخ داری.",
        { reply_markup: keyboard }
      );
    }

    // ANSWER
    if (data.startsWith("answer_")) {
      const parts = data.split("_");
      const qid = parts[1];
      const answer = Number(parts[2]);

      const questions = {
        q1: { correct: 0 },
        q2: { correct: 1 },
        q3: { correct: 1 }
      };

      const q = questions[qid];

      if (!q) return ctx.reply("سؤال معتبر نیست.");

      if (user.quizDone.includes(qid)) {
        return ctx.reply("این سؤال را قبلاً پاسخ داده‌ای.");
      }

      user.quizDone.push(qid);

      if (answer === q.correct) {
        addPoints(user.id, 10, "Correct quiz answer");

        return ctx.reply(
          "پاسخ درست بود!\n10 امتیاز دریافت کردی."
        );
      }

      saveDB();

      return ctx.reply(
        "پاسخ درست نبود. دفعه بعد تلاش کن."
      );
    }

    // PREDICTION
    if (data === "prediction") {
      const keyboard = new InlineKeyboard()
        .text("گزینه اول", "prediction_a")
        .text("گزینه دوم", "prediction_b");

      return ctx.reply(
        "🔮 پیش‌بینی تفریحی\n\n" +
        "این بخش صرفاً برای سرگرمی است. انتخاب تو هیچ امتیازی کم نمی‌کند و جایزه مالی یا شانسی ندارد.\n\n" +
        "به نظر تو کدام گزینه انتخاب می‌شود؟",
        { reply_markup: keyboard }
      );
    }

    if (
      data === "prediction_a" ||
      data === "prediction_b"
    ) {
      return ctx.reply(
        "انتخابت ثبت شد. این انتخاب صرفاً تفریحی است و امتیاز یا جایزه‌ای به آن وابسته نیست."
      );
    }

    // SUPPORT
    if (data === "support") {
      waiting.set(String(ctx.from.id), "support");

      return ctx.reply(
        "پیام خود را ارسال کن تا برای مدیریت فرستاده شود.\n\nبرای لغو /cancel را بزن."
      );
    }

    // BACK
    if (data === "back") {
      return ctx.reply(
        "منوی اصلی:",
        { reply_markup: mainMenu() }
      );
    }
  });

  // ================= ADMIN PANEL =================

  async function showAdmin(ctx) {
    const keyboard = new InlineKeyboard()
      .text("📊 آمار", "admin_stats")
      .text("📥 درخواست‌ها", "admin_requests")
      .row()
      .text("👥 کاربران", "admin_users")
      .text("📜 گزارش‌ها", "admin_logs");

    await ctx.reply(
      "پنل مدیریت MAHAN REWARDS",
      { reply_markup: keyboard }
    );
  }

  bot.callbackQuery(/^admin_approve_(\d+)$/, async ctx => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.answerCallbackQuery({
        text: "دسترسی غیرمجاز",
        show_alert: true
      });
    }

    const id = Number(ctx.match[1]);

    const request = db.requests.find(
      r => r.id === id
    );

    if (!request || request.status !== "pending") {
      return ctx.answerCallbackQuery("درخواست معتبر نیست.");
    }

    request.status = "approved";
    request.approvedBy = String(ctx.from.id);

    saveDB();

    ctx.api.sendMessage(
      request.userId,
      `درخواست شماره ${id} تأیید شد.\nبرای تحویل جایزه، مدیریت با شما هماهنگ می‌کند.`
    ).catch(() => {});

    await ctx.answerCallbackQuery("درخواست تأیید شد.");
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
    }).catch(() => {});
  });

  bot.callbackQuery(/^admin_reject_(\d+)$/, async ctx => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.answerCallbackQuery({
        text: "دسترسی غیرمجاز",
        show_alert: true
      });
    }

    const id = Number(ctx.match[1]);

    const request = db.requests.find(
      r => r.id === id
    );

    if (!request || request.status !== "pending") {
      return ctx.answerCallbackQuery("درخواست معتبر نیست.");
    }

    request.status = "rejected";
    request.rejectedBy = String(ctx.from.id);

    addPoints(
      request.userId,
      request.cost,
      "Refund: rejected reward request"
    );

    saveDB();

    ctx.api.sendMessage(
      request.userId,
      `درخواست شماره ${id} رد شد.\nامتیازها به کیف پولت برگشت داده شدند.`
    ).catch(() => {});

    await ctx.answerCallbackQuery("درخواست رد شد.");
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
    }).catch(() => {});
  });

  bot.callbackQuery("admin_stats", async ctx => {
    if (!isAdmin(ctx.from.id)) return;

    const users = Object.keys(db.users).length;
    const pending = db.requests.filter(
      r => r.status === "pending"
    ).length;

    const points = Object.values(db.users).reduce(
      (sum, u) => sum + u.points,
      0
    );

    await ctx.answerCallbackQuery();

    await ctx.reply(
      `📊 آمار ربات\n\n` +
      `کاربران: ${users}\n` +
      `درخواست‌های در انتظار: ${pending}\n` +
      `مجموع امتیاز کاربران: ${points}`
    );
  });

  bot.callbackQuery("admin_requests", async ctx => {
    if (!isAdmin(ctx.from.id)) return;

    const requests = db.requests
      .filter(r => r.status === "pending")
      .slice(-20);

    await ctx.answerCallbackQuery();

    if (!requests.length) {
      return ctx.reply("درخواست در انتظار وجود ندارد.");
    }

    let text = "📥 درخواست‌های در انتظار\n\n";

    requests.forEach(r => {
      text +=
        `شماره: ${r.id}\n` +
        `کاربر: ${r.userId}\n` +
        `جایزه: ${r.rewardTitle}\n\n`;
    });

    await ctx.reply(text);
  });

  bot.callbackQuery("admin_users", async ctx => {
    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCallbackQuery();

    const users = Object.values(db.users).slice(-30);

    let text = "👥 کاربران اخیر\n\n";

    users.forEach(u => {
      text += `${u.name} | ${u.id} | ${u.points} امتیاز\n`;
    });

    await ctx.reply(text);
  });

  bot.callbackQuery("admin_logs", async ctx => {
    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCallbackQuery();

    const logs = db.logs.slice(-15).reverse();

    let text = "📜 گزارش‌های اخیر\n\n";

    logs.forEach(item => {
      text +=
        `${item.action} | ${item.userId}\n` +
        `${item.details}\n\n`;
    });

    await ctx.reply(text);
  });

  // ================= ADMIN DELIVERY =================

  bot.command("delivered", async ctx => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply("دسترسی غیرمجاز.");
    }

    const id = Number(ctx.match);

    const request = db.requests.find(
      r => r.id === id
    );

    if (!request || request.status !== "approved") {
      return ctx.reply(
        "درخواست پیدا نشد یا هنوز تأیید نشده است."
      );
    }

    request.status = "delivered";
    request.deliveredBy = String(ctx.from.id);
    request.deliveredAt = new Date().toISOString();

    saveDB();

    await ctx.api.sendMessage(
      request.userId,
      `🎁 جایزه درخواست شماره ${id} تحویل داده شد.`
    ).catch(() => {});

    await ctx.reply("وضعیت درخواست به تحویل‌شده تغییر کرد.");
  });

  // ================= SUPPORT + TEXT =================

  bot.on("message:text", async ctx => {
    const id = String(ctx.from.id);
    const mode = waiting.get(id);

    if (!mode) return;

    if (mode === "support") {
      waiting.delete(id);

      for (const adminId of ADMIN_IDS) {
        await ctx.api.sendMessage(
          adminId,
          `📩 پیام پشتیبانی\n\n` +
          `کاربر: ${id}\n` +
          `نام: ${ctx.from.first_name}\n\n` +
          `${ctx.message.text}`
        ).catch(() => {});
      }

      return ctx.reply(
        "پیام شما برای مدیریت ارسال شد."
      );
    }
  });

  console.log("MAHAN REWARDS commands registered.");
}

module.exports = { registerCommands };
