
import { InlineKeyboard } from "grammy";

const API = "https://api.binance.com";
const FUTURES_API = "https://fapi.binance.com";

const COINS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "DOGEUSDT", "ADAUSDT", "TRXUSDT", "TONUSDT", "LINKUSDT",
  "AVAXUSDT", "DOTUSDT", "LTCUSDT", "BCHUSDT", "SUIUSDT",
  "XLMUSDT", "HBARUSDT", "SHIBUSDT", "UNIUSDT", "AAVEUSDT",
  "NEARUSDT", "ETCUSDT", "APTUSDT", "ICPUSDT", "FILUSDT",
  "ATOMUSDT", "ARBUSDT", "OPUSDT", "INJUSDT", "RENDERUSDT"
];

const WHALE_THRESHOLD = 100000;

// ======================================
// أدوات الاتصال ببيانات Binance
// ======================================

async function getJSON(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", url, error.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatPrice(price) {
  if (!Number.isFinite(Number(price))) return "غير متاح";

  return Number(price).toLocaleString("en-US", {
    maximumFractionDigits: 8
  });
}

function formatNumber(number) {
  if (!Number.isFinite(Number(number))) return "غير متاح";

  return Number(number).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

// ======================================
// المؤشرات الفنية
// ======================================

function calculateEMA(values, period) {
  if (!values || values.length < period) return null;

  const multiplier = 2 / (period + 1);

  let ema = values
    .slice(0, period)
    .reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRSI(values, period = 14) {
  if (!values || values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateATR(candles, period = 14) {
  if (!candles || candles.length <= period) return null;

  const ranges = [];

  for (let i = 1; i < candles.length; i++) {
    const high = Number(candles[i][2]);
    const low = Number(candles[i][3]);
    const previousClose = Number(candles[i - 1][4]);

    const trueRange = Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );

    ranges.push(trueRange);
  }

  const recent = ranges.slice(-period);

  return recent.reduce((sum, value) => sum + value, 0) / recent.length;
}

// ======================================
// بيانات السوق
// ======================================

async function getTicker(symbol) {
  return getJSON(`${API}/api/v3/ticker/24hr?symbol=${symbol}`);
}

async function getCandles(symbol, interval = "15m", limit = 100) {
  return getJSON(
    `${API}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
}

async function getOrderBook(symbol) {
  return getJSON(
    `${API}/api/v3/depth?symbol=${symbol}&limit=20`
  );
}

async function getRecentTrades(symbol) {
  return getJSON(
    `${API}/api/v3/aggTrades?symbol=${symbol}&limit=500`
  );
}

async function getOpenInterest(symbol) {
  return getJSON(
    `${FUTURES_API}/fapi/v1/openInterest?symbol=${symbol}`
  );
}

async function getFundingRate(symbol) {
  const data = await getJSON(
    `${FUTURES_API}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
  );

  return Array.isArray(data) && data.length ? data[0] : null;
}

// ======================================
// تحليل ضغط الشراء والبيع
// ======================================

function analyzeOrderBook(orderBook) {
  if (!orderBook?.bids || !orderBook?.asks) {
    return {
      buyVolume: 0,
      sellVolume: 0,
      pressure: 0,
      direction: "غير متاح"
    };
  }

  const buyVolume = orderBook.bids.reduce(
    (sum, item) => sum + Number(item[0]) * Number(item[1]),
    0
  );

  const sellVolume = orderBook.asks.reduce(
    (sum, item) => sum + Number(item[0]) * Number(item[1]),
    0
  );

  const total = buyVolume + sellVolume;

  const pressure = total > 0
    ? ((buyVolume - sellVolume) / total) * 100
    : 0;

  let direction = "متوازن";

  if (pressure > 15) direction = "ضغط شراء";
  if (pressure < -15) direction = "ضغط بيع";

  return {
    buyVolume,
    sellVolume,
    pressure,
    direction
  };
}

// ======================================
// رصد الصفقات الكبيرة
// ======================================

function detectWhales(trades) {
  if (!Array.isArray(trades)) {
    return {
      buyCount: 0,
      sellCount: 0,
      buyVolume: 0,
      sellVolume: 0,
      whales: []
    };
  }

  let buyCount = 0;
  let sellCount = 0;
  let buyVolume = 0;
  let sellVolume = 0;

  const whales = [];

  for (const trade of trades) {
    const price = Number(trade.p);
    const quantity = Number(trade.q);
    const value = price * quantity;

    // Binance: m=true تعني أن المشتري هو صانع السوق
    const isSell = trade.m === true;

    if (isSell) {
      sellVolume += value;
    } else {
      buyVolume += value;
    }

    if (value >= WHALE_THRESHOLD) {
      if (isSell) sellCount++;
      else buyCount++;

      whales.push({
        value,
        price,
        type: isSell ? "بيع كبير" : "شراء كبير"
      });
    }
  }

  return {
    buyCount,
    sellCount,
    buyVolume,
    sellVolume,
    whales: whales.slice(-10)
  };
}

// ======================================
// التحليل الفني الأساسي
// ======================================

async function analyzeCoin(symbol) {
  const [ticker, candles] = await Promise.all([
    getTicker(symbol),
    getCandles(symbol, "15m", 100)
  ]);

  if (!ticker || !Array.isArray(candles) || candles.length < 30) {
    return null;
  }

  const closes = candles.map(candle => Number(candle[4]));
  const volumes = candles.map(candle => Number(candle[5]));

  const price = Number(ticker.lastPrice);
  const change24h = Number(ticker.priceChangePercent);

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(candles, 14);

  const averageVolume = volumes
    .slice(-21, -1)
    .reduce((sum, value) => sum + value, 0) / 20;

  const currentVolume = volumes[volumes.length - 1];

  const volumeRatio = averageVolume > 0
    ? currentVolume / averageVolume
    : 0;

  let score = 0;

  if (ema20 !== null && ema50 !== null) {
    if (ema20 > ema50) score += 2;
    else score -= 2;
  }

  if (ema20 !== null) {
    if (price > ema20) score++;
    else score--;
  }

  if (rsi !== null) {
    if (rsi > 50 && rsi < 70) score++;
    if (rsi < 50 && rsi > 30) score--;
  }

  if (change24h > 2) score++;
  if (change24h < -2) score--;

  if (volumeRatio > 1.5) {
    score += change24h >= 0 ? 1 : -1;
  }

  let direction = "محايد";

  if (score >= 3) direction = "صعود";
  if (score <= -3) direction = "هبوط";

  return {
    symbol,
    price,
    change24h,
    high24h: Number(ticker.highPrice),
    low24h: Number(ticker.lowPrice),
    quoteVolume: Number(ticker.quoteVolume),
    ema20,
    ema50,
    rsi,
    atr,
    currentVolume,
    averageVolume,
    volumeRatio,
    score,
    direction,
    candles
  };
}

// ======================================
// تحليل العقود الآجلة
// ======================================

async function analyzeFutures(symbol) {
  const [openInterest, funding] = await Promise.all([
    getOpenInterest(symbol),
    getFundingRate(symbol)
  ]);

  return {
    openInterest: openInterest
      ? Number(openInterest.openInterest)
      : null,

    fundingRate: funding
      ? Number(funding.fundingRate)
      : null
  };
}

// ======================================
// التحليل المتقدم
// ======================================

async function analyzeAdvancedCoin(symbol) {
  const [basic, orderBook, trades, futures] = await Promise.all([
    analyzeCoin(symbol),
    getOrderBook(symbol),
    getRecentTrades(symbol),
    analyzeFutures(symbol)
  ]);

  if (!basic) return null;

  const pressure = analyzeOrderBook(orderBook);
  const whaleData = detectWhales(trades);

  let score = basic.score;

  if (pressure.pressure > 15) score++;
  if (pressure.pressure < -15) score--;

  if (whaleData.buyVolume > whaleData.sellVolume * 1.5) {
    score++;
  }

  if (whaleData.sellVolume > whaleData.buyVolume * 1.5) {
    score--;
  }

  let direction = "محايد";

  if (score >= 3) direction = "صعود";
  if (score <= -3) direction = "هبوط";

  return {
    ...basic,
    score,
    direction,
    pressure,
    whaleData,
    futures
  };
}

// ======================================
// اكتشاف الحركة المفاجئة
// ======================================

function detectExplosion(analysis) {
  if (!analysis) return null;

  const change = analysis.change24h;
  const volume = analysis.volumeRatio;

  if (change >= 5 && volume >= 1.8) {
    return "🚀 حركة صعود قوية مع ارتفاع الحجم";
  }

  if (change <= -5 && volume >= 1.8) {
    return "🔻 حركة هبوط قوية مع ارتفاع الحجم";
  }

  if (volume >= 3) {
    return "⚡ ارتفاع غير معتاد في حجم التداول";
  }

  return null;
}

// ======================================
// خطة الصفقة
// ======================================

function buildTradePlan(analysis) {
  if (!analysis || !analysis.atr) return null;

  const price = analysis.price;
  const atr = analysis.atr;

  if (analysis.direction === "صعود") {
    return {
      type: "LONG",
      entry: price,
      stopLoss: price - atr * 1.5,
      target1: price + atr * 2,
      target2: price + atr * 3,
      target3: price + atr * 4
    };
  }

  if (analysis.direction === "هبوط") {
    return {
      type: "SHORT",
      entry: price,
      stopLoss: price + atr * 1.5,
      target1: price - atr * 2,
      target2: price - atr * 3,
      target3: price - atr * 4
    };
  }

  return null;
}

// ======================================
// تقرير العملة
// ======================================

function createCoinReport(analysis) {
  if (!analysis) return "❌ تعذر تحليل العملة.";

  const plan = buildTradePlan(analysis);
  const explosion = detectExplosion(analysis);

  const futures = analysis.futures || {};
  const whales = analysis.whaleData || {};

  let message = `
📊 تحليل ${analysis.symbol}

💰 السعر: ${formatPrice(analysis.price)} USDT
📈 التغير خلال 24 ساعة: ${formatNumber(analysis.change24h)}%

📉 المؤشرات الفنية
━━━━━━━━━━━━━━
RSI: ${formatNumber(analysis.rsi)}
EMA 20: ${formatPrice(analysis.ema20)}
EMA 50: ${formatPrice(analysis.ema50)}
ATR: ${formatPrice(analysis.atr)}

📊 حجم التداول
الحجم الحالي مقارنة بالمتوسط:
${formatNumber(analysis.volumeRatio)}x

🐋 رصد الصفقات الكبيرة
عمليات شراء كبيرة: ${whales.buyCount ?? 0}
عمليات بيع كبيرة: ${whales.sellCount ?? 0}

حجم الشراء المرصود:
${formatNumber(whales.buyVolume ?? 0)} USDT

حجم البيع المرصود:
${formatNumber(whales.sellVolume ?? 0)} USDT

⚖️ دفتر الطلبات
ضغط السوق: ${analysis.pressure?.direction ?? "غير متاح"}
نسبة الضغط: ${formatNumber(analysis.pressure?.pressure ?? 0)}%

📑 العقود الآجلة
Open Interest:
${formatNumber(futures.openInterest)}

Funding Rate:
${futures.fundingRate !== null && futures.fundingRate !== undefined
    ? (futures.fundingRate * 100).toFixed(5) + "%"
    : "غير متاح"}

🎯 التقييم النهائي
━━━━━━━━━━━━━━
الاتجاه: ${analysis.direction}
قوة الإشارة: ${analysis.score}/6
`;

  if (explosion) {
    message += `\n${explosion}\n`;
  }

  if (plan) {
    message += `
🎯 خطة تداول استرشادية (${plan.type})
━━━━━━━━━━━━━━
الدخول: ${formatPrice(plan.entry)}
وقف الخسارة: ${formatPrice(plan.stopLoss)}

الهدف الأول: ${formatPrice(plan.target1)}
الهدف الثاني: ${formatPrice(plan.target2)}
الهدف الثالث: ${formatPrice(plan.target3)}
`;
  } else {
    message += "\n⏳ لا توجد إشارة دخول واضحة حاليًا.\n";
  }

  message += `
⚠️ التحليل ليس ضمانًا للربح.
استخدم إدارة رأس المال وراجع السوق قبل الدخول.
`;

  return message;
}

// ======================================
// فحص السوق بالكامل
// ======================================

async function scanMarket() {
  const results = [];

  for (const symbol of COINS) {
    try {
      const analysis = await analyzeAdvancedCoin(symbol);

      if (analysis) {
        results.push(analysis);
      }
    } catch (error) {
      console.error("Scan error:", symbol, error.message);
    }

    // تقليل الضغط على واجهة Binance
    await sleep(250);
  }

  return results;
}

// ======================================
// ملخص السوق
// ======================================

function createMarketSummary(results) {
  if (!results || results.length === 0) {
    return "❌ لم أتمكن من جلب بيانات السوق.";
  }

  const sorted = [...results].sort((a, b) => b.score - a.score);

  const bullish = results.filter(item => item.direction === "صعود");
  const bearish = results.filter(item => item.direction === "هبوط");

  let message = `
🌍 تقرير السوق الكامل
━━━━━━━━━━━━━━

🟢 فرص صعود: ${bullish.length}
🔴 فرص هبوط: ${bearish.length}
📊 العملات المحللة: ${results.length}

🚀 أقوى العملات إيجابيًا
`;

  sorted.slice(0, 5).forEach((item, index) => {
    message += `
${index + 1}. ${item.symbol}
السعر: ${formatPrice(item.price)}
التغير: ${formatNumber(item.change24h)}%
التقييم: ${item.score}
`;
  });

  message += "\n🔻 أقوى العملات سلبيًا\n";

  [...results]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .forEach((item, index) => {
      message += `
${index + 1}. ${item.symbol}
السعر: ${formatPrice(item.price)}
التغير: ${formatNumber(item.change24h)}%
التقييم: ${item.score}
`;
    });

  message += `
⚠️ النتائج تحليلية وليست توصية مضمونة.
`;

  return message;
}

// ======================================
// تسجيل أوامر Telegram
// ======================================

export function registerCommands(bot) {

  // القائمة الرئيسية
  bot.command("start", async ctx => {
    const keyboard = new InlineKeyboard()
      .text("📊 فحص السوق", "scan")
      .row()
      .text("🔥 أقوى الفرص", "signals")
      .row()
      .text("ℹ️ المساعدة", "help");

    await ctx.reply(
      `🚀 أهلاً بك في بوت التحليل الذكي للعملات الرقمية.

أراقب لك 30 عملة وأحلل:
• الاتجاهات والمؤشرات الفنية
• الصفقات الكبيرة
• ضغط الشراء والبيع
• العقود الآجلة
• فرص Long وShort
• وقف الخسارة والأهداف

استخدم الأزرار أو الأوامر للبدء.`,
      { reply_markup: keyboard }
    );
  });

  // المساعدة
  bot.command("help", async ctx => {
    await ctx.reply(`
📚 أوامر البوت

/start - القائمة الرئيسية
/help - المساعدة
/ping - اختبار البوت
/market - ملخص السوق
/scan - فحص العملات
/signals - أقوى الفرص
/coin BTC - تحليل عملة محددة

مثال:
 /coin BTC
 /coin ETH
 /coin SOL

ملاحظة:
التحليل استرشادي ولا ينفذ صفقات تلقائيًا.
`);
  });

  // اختبار البوت
  bot.command("ping", async ctx => {
    await ctx.reply("✅ البوت يعمل بنجاح.");
  });

  // تحليل عملة محددة
  bot.command("coin", async ctx => {
    const input = ctx.match?.trim().toUpperCase();

    if (!input) {
      return ctx.reply(
        "اكتب رمز العملة بعد الأمر.\nمثال: /coin BTC"
      );
    }

    const symbol = input.endsWith("USDT")
      ? input
      : `${input}USDT`;

    if (!COINS.includes(symbol)) {
      return ctx.reply(
        "❌ العملة غير موجودة في قائمة العملات المدعومة."
      );
    }

    const status = await ctx.reply(
      `⏳ جاري تحليل ${symbol}...`
    );

    const analysis = await analyzeAdvancedCoin(symbol);

    if (!analysis) {
      return ctx.api.editMessageText(
        ctx.chat.id,
        status.message_id,
        "❌ تعذر جلب بيانات العملة حاليًا."
      );
    }

    return ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      createCoinReport(analysis)
    );
  });

  // فحص السوق
  bot.command("scan", async ctx => {
    const status = await ctx.reply(
      "🔍 بدأت فحص العملات الـ30. قد تستغرق العملية بعض الوقت..."
    );

    const results = await scanMarket();

    if (!results.length) {
      return ctx.api.editMessageText(
        ctx.chat.id,
        status.message_id,
        "❌ تعذر فحص السوق."
      );
    }

    const summary = createMarketSummary(results);

    return ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      summary
    );
  });

  // ملخص السوق
  bot.command("market", async ctx => {
    const status = await ctx.reply(
      "🌍 جاري إعداد تقرير السوق..."
    );

    const results = await scanMarket();

    return ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      createMarketSummary(results)
    );
  });

  // أقوى الفرص
  bot.command("signals", async ctx => {
    const status = await ctx.reply(
      "🎯 جاري البحث عن أفضل فرص التداول..."
    );

    const results = await scanMarket();

    const opportunities = results
      .filter(item => item.direction !== "محايد")
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 10);

    if (!opportunities.length) {
      return ctx.api.editMessageText(
        ctx.chat.id,
        status.message_id,
        "⏳ لا توجد فرص واضحة حاليًا."
      );
    }

    let message = "🔥 أقوى فرص السوق\n━━━━━━━━━━━━━━\n";

    for (const item of opportunities) {
      const plan = buildTradePlan(item);

      message += `
${item.direction === "صعود" ? "🟢" : "🔴"} ${item.symbol}
الاتجاه: ${item.direction}
السعر: ${formatPrice(item.price)}
RSI: ${formatNumber(item.rsi)}
التقييم: ${item.score}
`;

      if (plan) {
        message += `الدخول: ${formatPrice(plan.entry)}
وقف الخسارة: ${formatPrice(plan.stopLoss)}
الهدف الأول: ${formatPrice(plan.target1)}
`;
      }

      message += "\n";
    }

    message += "⚠️ راجع التحليل وإدارة المخاطر قبل التداول.";

    return ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      message
    );
  });

  // أزرار القائمة
  bot.callbackQuery("help", async ctx => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "الأوامر المتاحة:\n/scan\n/market\n/signals\n/coin BTC"
    );
  });

  bot.callbackQuery("scan", async ctx => {
    await ctx.answerCallbackQuery();

    const status = await ctx.reply(
      "⏳ جاري فحص السوق..."
    );

    const results = await scanMarket();

    await ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      createMarketSummary(results)
    );
  });

  bot.callbackQuery("signals", async ctx => {
    await ctx.answerCallbackQuery();

    const status = await ctx.reply(
      "⏳ جاري البحث عن الفرص..."
    );

    const results = await scanMarket();

    const opportunities = results
      .filter(item => item.direction !== "محايد")
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 10);

    let message = "🔥 الفرص الحالية\n\n";

    if (!opportunities.length) {
      message += "لا توجد فرص واضحة حاليًا.";
    } else {
      for (const item of opportunities) {
        message += `${item.symbol}: ${item.direction} | التقييم ${item.score}\n`;
      }
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      message
    );
  });

  // معلومات المستخدم
  bot.command("id", async ctx => {
    await ctx.reply(`معرف حسابك: ${ctx.from.id}`);
  });

  console.log("Crypto commands registered successfully.");
}
