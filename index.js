// OLX -> Telegram бот, версія 1. Без залежностей (потрібен Node 18+).
const fs = require('fs');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN;
if (!TOKEN) { console.error('Немає токена бота у змінних середовища'); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const FILE = 'data.json';
const EVERY_MIN = 5;
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const GOOD = /натуральн\w*\s+шкір|вінтаж|винтаж|vintage|genuine leather|made in (italy|england|usa|japan)/i;

let db = { owner: null, queries: [] };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const save = () => { try { fs.writeFileSync(FILE, JSON.stringify(db)); } catch (e) { console.error('save', e.message); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tg(method, body) {
  try {
    const r = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    console.error('tg', method, e.message);
    return null;
  }
}
const say = (chat_id, text) => tg('sendMessage', { chat_id, text, disable_web_page_preview: true });

async function olx(query) {
  const url = 'https://www.olx.ua/api/v1/offers/?offset=0&limit=40&sort_by=created_at%3Adesc&query=' + encodeURIComponent(query);
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', 'accept-language': 'uk-UA,uk;q=0.9' } });
  if (!r.ok) throw new Error('OLX відповів HTTP ' + r.status);
  const j = await r.json();
  return (j.data || []).map((o) => {
    const p = (o.params || []).find((x) => x.key === 'price');
    const link = o.photos && o.photos[0] && o.photos[0].link;
    return {
      id: String(o.id),
      title: o.title || '',
      url: o.url,
      price: p && p.value ? p.value.value : null,
      cur: p && p.value ? p.value.currency : '',
      city: (o.location && o.location.city && o.location.city.name) || '',
      photo: link ? link.replace('{width}', '600').replace('{height}', '600') : null,
      text: (o.title || '') + ' ' + (o.description || ''),
    };
  });
}

async function send(i, q) {
  const flag = GOOD.test(i.text) ? '🏷 ' : '';
  const caption =
    `${flag}${i.title}\n💰 ${i.price != null ? i.price + ' ' + i.cur : 'ціна не вказана'}\n📍 ${i.city}\n🔎 ${q.text}\n${i.url}`;
  if (i.photo) {
    const r = await tg('sendPhoto', { chat_id: db.owner, photo: i.photo, caption });
    if (r && r.ok) return;
  }
  await say(db.owner, caption);
}

// seedOnly = true: просто запам'ятати наявні оголошення, нічого не надсилаючи
async function check(q, seedOnly) {
  const items = await olx(q.text);
  const seen = new Set(q.seen);
  const fresh = items.filter((i) => !seen.has(i.id));
  items.forEach((i) => seen.add(i.id));
  q.seen = [...seen].slice(-500);
  q.err = false;
  save();
  if (seedOnly) return items.length;
  const toSend = fresh.filter((i) => !(q.max && i.price != null && i.price > q.max)).reverse().slice(-10);
  for (const i of toSend) { await send(i, q); await sleep(700); }
  return toSend.length;
}

let busy = false;
async function checkAll(manualChat) {
  if (busy || !db.owner) return;
  busy = true;
  let total = 0;
  try {
    for (const q of db.queries) {
      try { total += await check(q); }
      catch (e) {
        console.error('check', q.text, e.message);
        if (!q.err) { q.err = true; save(); await say(db.owner, `⚠️ Помилка пошуку «${q.text}»: ${e.message}`); }
      }
      await sleep(2000 + Math.random() * 3000);
    }
  } finally { busy = false; }
  if (manualChat) await say(manualChat, `Перевірено. Нових оголошень: ${total}`);
}

const HELP =
  'Команди:\n' +
  '/add schott шкіряна куртка | 3000 — стежити за запитом (після | максимальна ціна в грн, не обов\'язково)\n' +
  '/list — мої запити\n' +
  '/del 2 — видалити запит №2\n' +
  '/check — перевірити зараз\n' +
  '/test — чи бачить сервер OLX';

async function handle(m) {
  const chat = m.chat.id;
  const c = (m.text || '').match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
  if (!c) return;
  const cmd = c[1].toLowerCase();
  const arg = c[2].trim();
  if (!db.owner && cmd === 'start') { db.owner = chat; save(); }
  if (chat !== db.owner) return; // бот приватний: слухає лише першого, хто написав /start
  const reply = (t) => say(chat, t);

  if (cmd === 'start' || cmd === 'help') return reply('Привіт! Я стежу за новими оголошеннями на OLX.\n\n' + HELP);

  if (cmd === 'add') {
    const parts = arg.split('|').map((s) => s.trim());
    if (!parts[0]) return reply('Приклад: /add schott шкіряна куртка | 3000');
    const q = { text: parts[0], max: parseInt(parts[1]) || 0, seen: [] };
    try {
      const n = await check(q, true);
      db.queries.push(q);
      save();
      return reply(`✅ Додано: «${q.text}»${q.max ? ' до ' + q.max + ' грн' : ''}.\nЗараз на OLX ${n} оголошень — їх не показую, надішлю лише нові.`);
    } catch (e) {
      return reply('Не вдалося перевірити OLX: ' + e.message);
    }
  }

  if (cmd === 'list') {
    if (!db.queries.length) return reply('Запитів ще немає. Додай: /add schott шкіряна куртка | 3000');
    return reply(db.queries.map((q, k) => `${k + 1}. ${q.text}${q.max ? ' (до ' + q.max + ' грн)' : ''}`).join('\n'));
  }

  if (cmd === 'del') {
    const k = parseInt(arg) - 1;
    if (!db.queries[k]) return reply('Такого номера немає. Дивись /list');
    const [gone] = db.queries.splice(k, 1);
    save();
    return reply('Видалено: ' + gone.text);
  }

  if (cmd === 'check') {
    if (busy) return reply('Перевірка вже йде, зачекай хвилину.');
    await reply('Перевіряю...');
    return checkAll(chat);
  }

  if (cmd === 'test') {
    try {
      const items = await olx('шкіряна куртка');
      return reply(`✅ OLX відповідає. Знайдено оголошень: ${items.length}.` + (items[0] ? `\nНайновіше: ${items[0].title}` : ''));
    } catch (e) {
      return reply('❌ ' + e.message);
    }
  }

  return reply(HELP);
}

async function poll() {
  let offset = 0;
  for (;;) {
    const r = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
    if (!r || !r.ok) { await sleep(3000); continue; }
    for (const u of r.result) {
      offset = u.update_id + 1;
      if (u.message && u.message.text) await handle(u.message).catch((e) => console.error('handle', e.message));
    }
  }
}

console.log('[olx-bot] запущено, інтервал перевірки', EVERY_MIN, 'хв');
setInterval(() => checkAll(), EVERY_MIN * 60 * 1000);
poll();
