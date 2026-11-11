import asyncio
import logging
import os
import re

from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.sessions import StringSession

load_dotenv()

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION = os.environ["SESSION"]
CHANNELS = [c.strip().lstrip("@") for c in os.environ.get("CHANNELS", "").split(",") if c.strip()]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("checkbot")

# Ссылки на чеки Crypto Bot: t.me/send?start=CQ... или t.me/CryptoBot?start=CQ...
CHECK_RE = re.compile(
    r"(?:https?://)?(?:t\.me|telegram\.me)/(send|CryptoBot)\?start=(C[\w-]+)", re.I
)
BOTS = {"send", "cryptobot"}

client = TelegramClient(StringSession(SESSION), API_ID, API_HASH)
seen: set[str] = set()


def extract(message) -> set[tuple[str, str]]:
    found = set()
    for text in filter(None, [message.raw_text]):
        found.update(CHECK_RE.findall(text))
    if message.buttons:
        for row in message.buttons:
            for btn in row:
                if getattr(btn, "url", None):
                    found.update(CHECK_RE.findall(btn.url))
    for ent in message.entities or []:
        url = getattr(ent, "url", None)
        if url:
            found.update(CHECK_RE.findall(url))
    return found


async def activate(bot: str, code: str):
    if code in seen:
        return
    seen.add(code)
    try:
        await client.send_message(bot, f"/start {code}")
        log.info("Активирую чек %s через @%s", code, bot)
    except Exception as e:
        log.error("Ошибка активации %s: %s", code, e)


@client.on(events.NewMessage(chats=CHANNELS or None))
@client.on(events.MessageEdited(chats=CHANNELS or None))
async def on_channel_message(event):
    for bot, code in extract(event.message):
        asyncio.create_task(activate(bot, code))


@client.on(events.NewMessage(from_users=list(BOTS), incoming=True))
async def on_bot_reply(event):
    log.info("Ответ бота: %s", (event.raw_text or "").replace("\n", " ")[:200])


async def main():
    await client.start()
    me = await client.get_me()
    log.info("Вошёл как %s. Слежу за каналами: %s", me.first_name, CHANNELS or "все чаты")
    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
