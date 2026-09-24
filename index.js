// A Telegram bot you can deploy in one click and then make your own.
//
// Two ways to receive updates:
//   polling (default): the bot asks Telegram for updates. Works everywhere,
//     needs no web address, fine for almost every bot.
//   webhook: Telegram pushes updates to https://<your app>/telegram. Set
//     TELEGRAM_MODE=webhook and WEBHOOK_URL to the app's public address.
//
// Handlers live in src/commands.js. This file only wires things up.

import http from "node:http"
import { Bot, webhookCallback } from "grammy"
import { registerCommands } from "./src/commands.js"

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing. Open Telegram, talk to @BotFather, send /newbot, and set the token it gives you as an environment variable.")
  process.exit(1)
}

const mode = (process.env.TELEGRAM_MODE || "polling").trim().toLowerCase()
const bot = new Bot(token)

registerCommands(bot)

bot.catch((err) => {
  console.error("[bot] error while handling an update:", err.error ?? err)
})

function explain(err) {
  const code = err?.error_code ?? err?.response?.error_code
  if (code === 401) {
    console.error("Telegram rejected the token (401 Unauthorized). Copy it again from @BotFather; a revoked token stops working at once.")
  } else if (code === 404) {
    console.error("Telegram answered 404: the token is not a bot token. It looks like 123456789:AAF... and comes from @BotFather.")
  } else {
    console.error("[bot] could not reach Telegram:", err?.message ?? err)
  }
}

async function main() {
  let me
  try {
    me = await bot.api.getMe()
  } catch (err) {
    explain(err)
    process.exit(1)
  }
  console.log(`[bot] logged in as @${me.username} (${mode} mode)`)

  if (mode === "webhook") {
    const url = (process.env.WEBHOOK_URL || "").trim().replace(/\/$/, "")
    if (!url.startsWith("https://")) {
      console.error("WEBHOOK_URL is missing or not https. Set it to the app's public address, for example https://my-bot.fadehost.app")
      process.exit(1)
    }
    const secret = (process.env.WEBHOOK_SECRET || "").trim() || undefined
    const port = Number(process.env.PORT || 3000)
    const handle = webhookCallback(bot, "http", { secretToken: secret })

    http
      .createServer((req, res) => {
        if (req.method === "POST" && req.url === "/telegram") return handle(req, res)
        if (req.method === "GET" && req.url === "/") {
          res.writeHead(200, { "content-type": "text/plain" })
          return res.end(`@${me.username} is running`)
        }
        res.writeHead(404)
        res.end()
      })
      .listen(port, () => console.log(`[bot] webhook server listening on port ${port}`))

    await bot.api.setWebhook(`${url}/telegram`, { secret_token: secret })
    console.log(`[bot] webhook set to ${url}/telegram`)
    return
  }

  // Polling: make sure no webhook is left over from an earlier webhook run.
  await bot.api.deleteWebhook().catch(() => {})
  await bot.start({ onStart: () => console.log("[bot] polling for updates") })
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    console.log(`[bot] ${signal}, stopping`)
    bot.stop().finally(() => process.exit(0))
  })
}

main()
