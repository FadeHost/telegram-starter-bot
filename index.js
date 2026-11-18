import { Telegraf, Markup } from 'telegraf';
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const texts = {
  en: `Hello Hani Family\nWe just started, and this is the best opportunity.\nPrice is at the bottom\nLive trading now - buy and sell now\nAvailable on Phantom, Trust Wallet and Jupiter\nLiquidity locked - trusted coin\nHold Hani, the future is ours.`,
  ar: `سلام عائلة هاني\nلقد بدأنا للتو، وهذه أفضل فرصة.\nالسعر في القاع\nالتداول مباشر الآن\nمتوفر على Phantom و Trust Wallet و Jupiter\nالسيولة مقفلة - عملة موثوقة\nاحتفظ بـ Hani، المستقبل لنا.`,
  ku: `سڵاو بنەماڵەی هانی\nئێمە تازە دەستمان پێکردووە، و ئەمە باشترین دەرفەتە.\nنرخەکە لە خوارەوەیە\nبازرگانی لە ئێستادا زیندووە\nلە Phantom و Trust Wallet و Jupiter بەردەستە\nلیکویدیتی قفڵ کراوە\nHani بگرە، داهاتوو هی ئێمەیە.`
};

bot.start((ctx) => {
  ctx.reply('Choose your language / اختر لغتك / زمانەکەت هەڵبژێرە', Markup.inlineKeyboard([
    [Markup.button.callback('English 🇬🇧', 'lang_en')],
    [Markup.button.callback('عربي 🇸🇦', 'lang_ar')],
    [Markup.button.callback('کوردی 🏳️', 'lang_ku')]
  ]));
});

bot.action('lang_en', (ctx) => { ctx.reply(texts.en); });
bot.action('lang_ar', (ctx) => { ctx.reply(texts.ar); });
bot.action('lang_ku', (ctx) => { ctx.reply(texts.ku); });
bot.on('text', (ctx) => { ctx.reply(texts.en); });

bot.launch();
console.log('Hani Bot Started');
