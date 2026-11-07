
import http from "node:http";
import { Bot, webhookCallback } from "grammy";
import { registerCommands } from "./src/commands.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is missing!");
  process.exit(1);
}

const mode = (process.env.TELEGRAM_MODE || "polling")
  .trim()
  .toLowerCase();

const bot = new Bot(token);

registerCommands(bot);

// گزارش خطاهای ربات
bot.catch((err) => {
  console.error("[BOT ERROR]", err.error ?? err);
});

function explain(err) {
  console.error(
    "[TELEGRAM ERROR]",
    err?.description || err?.message || err
  );
}

async function main() {
  try {
    const me = await bot.api.getMe();

    console.log(`[BOT] Connected as @${me.username}`);
    console.log(`[BOT] Mode: ${mode}`);

    if (mode === "webhook") {
      const url = (process.env.WEBHOOK_URL || "")
        .trim()
        .replace(/\/$/, "");

      if (!url.startsWith("https://")) {
        throw new Error("Invalid WEBHOOK_URL");
      }

      const secret =
        (process.env.WEBHOOK_SECRET || "").trim() || undefined;

      const port = Number(process.env.PORT || 3000);

      const handle = webhookCallback(bot, "http", {
        secretToken: secret
      });

      http.createServer((req, res) => {
        if (req.method === "POST" && req.url === "/telegram") {
          return handle(req, res);
        }

        if (req.method === "GET" && req.url === "/") {
          res.writeHead(200, {
            "content-type": "text/plain"
          });
          return res.end("Bot is running");
        }

        res.writeHead(404);
        res.end();
      }).listen(port, () => {
        console.log(`[BOT] Webhook server running on ${port}`);
      });

      await bot.api.setWebhook(`${url}/telegram`, {
        secret_token: secret,
        allowed_updates: [
          "message",
          "channel_post",
          "edited_channel_post",
          "callback_query"
        ]
      });

      console.log("[BOT] Webhook configured");
      return;
    }

    // حذف webhook قبلی
    await bot.api.deleteWebhook({
      drop_pending_updates: false
    });

    console.log("[BOT] Starting polling...");

    // دریافت صریح پیام‌های کانال
    await bot.start({
      allowed_updates: [
        "message",
        "channel_post",
        "edited_channel_post",
        "callback_query"
      ],

      onStart: () => {
        console.log("[BOT] Polling started successfully");
        console.log("[BOT] Waiting for channel posts...");
      }
    });

  } catch (err) {
    explain(err);
    process.exit(1);
  }
}

// توقف کنترل‌شده
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    console.log(`[BOT] ${signal} received`);
    bot.stop();
  });
}

main();
