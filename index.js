import http from "node:http";
import { Bot } from "grammy";
import { registerCommands } from "./src/commands.js";

const TOKEN = process.env.BOT_TOKEN;
const PORT = Number(process.env.PORT || 3000);

if (!TOKEN) {
  console.error("BOT_TOKEN is missing.");
  process.exit(1);
}

const bot = new Bot(TOKEN);

// Register Telegram commands
registerCommands(bot);

// Telegram error handling
bot.catch((error) => {
  console.error("Telegram error:", error);
});

// Hosting health check
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      status: "online",
      service: "Gold Trading Bot"
    }));

    return;
  }

  res.writeHead(200);
  res.end("Gold Trading Bot is running.");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Health server listening on port ${PORT}`);
});

// Start Telegram polling
bot.start({
  onStart: (info) => {
    console.log(`Bot started successfully: @${info.username}`);
  }
}).catch((error) => {
  console.error("BOT START ERROR:", error);
  process.exit(1);
});

// Graceful shutdown
async function shutdown() {
  console.log("Stopping bot...");

  try {
    await bot.stop();
  } catch (error) {
    console.error(error);
  }

  server.close(() => {
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
