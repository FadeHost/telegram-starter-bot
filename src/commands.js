
const seen = new Set()
const THRESHOLD = 70
const INTERVAL = 30 * 60 * 1000

function clean(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/\s+/g, " ")
    .trim()
}

function extractDeals(html) {
  const cards = html.split('data-component-type="s-search-result"')
  const deals = []

  for (const raw of cards.slice(1)) {
    const card = raw.slice(0, 18000)

    const asin = card.match(/data-asin="([A-Z0-9]{10})"/)?.[1]
    if (!asin) continue

    const titleHtml = card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]
    const title = titleHtml ? clean(titleHtml) : "Producto Amazon"

    const priceHtml = card.match(/class="a-offscreen"[^>]*>([\s\S]*?)<\/span>/)?.[1]
    const price = priceHtml ? clean(priceHtml) : ""

    const discountMatches = [
      ...card.matchAll(/(\d{1,2})\s*%\s*(?:de descuento|de ahorro|off|ahorro)/gi)
    ]

    const discount = discountMatches.length
      ? Math.max(...discountMatches.map(m => Number(m[1])))
      : 0

    if (discount < THRESHOLD || discount > 99) continue
    if (!price || !/\d/.test(price)) continue

    deals.push({
      asin,
      title: title.slice(0, 250),
      price,
      discount,
      url: `https://www.amazon.es/dp/${asin}`
    })
  }

  return deals
}

export function registerCommands(bot) {
  let chatId = process.env.TELEGRAM_CHAT_ID || null
  let scanning = false

  const terms = (
    process.env.AMAZON_SEARCH_TERMS || "ofertas tecnología"
  ).split(",").map(x => x.trim()).filter(Boolean)

  async function searchAmazon() {
    const found = []

    for (const term of terms) {
      const url = new URL("https://www.amazon.es/s")
      url.searchParams.set("k", term)

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PriceMonitor/1.0)",
          "Accept-Language": "es-ES,es;q=0.9"
        },
        signal: AbortSignal.timeout(20000)
      })

      if (!response.ok) {
        throw new Error(`Amazon respondió HTTP ${response.status}`)
      }

      const html = await response.text()
      if (/captcha|robot check/i.test(html)) {
        throw new Error("Amazon ha solicitado una comprobación CAPTCHA")
      }

      found.push(...extractDeals(html))
    }

    return found
  }

  async function scan(targetChat, manual = false) {
    if (scanning) {
      if (manual) await bot.api.sendMessage(targetChat, "Ya hay una búsqueda en marcha.")
      return
    }

    scanning = true

    try {
      const deals = await searchAmazon()
      const fresh = deals.filter(deal => !seen.has(deal.asin))

      for (const deal of fresh) {
        await bot.api.sendMessage(
          targetChat,
          `🚨 POSIBLE OFERTA EXTRAORDINARIA\n\n` +
          `📦 ${deal.title}\n\n` +
          `💰 Precio anunciado: ${deal.price}\n` +
          `🔥 Descuento anunciado: ${deal.discount}%\n\n` +
          `🛒 ${deal.url}\n\n` +
          `⚠️ Comprueba el precio final antes de comprar. No es un error confirmado.`,
          { link_preview_options: { is_disabled: true } }
        )

        seen.add(deal.asin)
      }

      if (manual && fresh.length === 0) {
        await bot.api.sendMessage(
          targetChat,
          "No he encontrado nuevas ofertas que cumplan el filtro del 70%."
        )
      }

      console.log(`[Amazon] ${deals.length} ofertas detectadas; ${fresh.length} nuevas.`)

    } catch (error) {
      console.error("[Amazon] Error de búsqueda:", error.message)

      if (manual) {
        await bot.api.sendMessage(
          targetChat,
          `No se pudo completar la búsqueda: ${error.message}`
        )
      }
    } finally {
      scanning = false
    }
  }

  bot.command("start", async ctx => {
    chatId = String(ctx.chat.id)

    await ctx.reply(
      "🤖 Detector Amazon España activado.\n\n" +
      "Buscaré automáticamente cada 30 minutos.\n" +
      "Descuento mínimo: 70%.\n\n" +
      "Usa /buscar para buscar ahora.\n" +
      "Usa /estado para consultar el estado.\n" +
      "Usa /stop para detener las alertas."
    )

    await scan(chatId)
  })

  bot.command("buscar", async ctx => {
    chatId = String(ctx.chat.id)
    await ctx.reply("🔎 Buscando en Amazon España...")
    await scan(chatId, true)
  })

  bot.command("estado", ctx =>
    ctx.reply(
      `🤖 Bot activo\n` +
      `📊 Descuento mínimo: ${THRESHOLD}%\n` +
      `⏱️ Intervalo: 30 minutos\n` +
      `🔎 Búsquedas: ${terms.join(", ")}`
    )
  )

  bot.command("stop", async ctx => {
    if (String(ctx.chat.id) !== String(chatId)) {
      return ctx.reply("No tienes permiso para detener estas alertas.")
    }

    chatId = null
    await ctx.reply("Alertas automáticas detenidas. Puedes reactivarlas con /start.")
  })

  bot.command("ping", ctx => ctx.reply("pong 🟢"))

  bot.command("id", ctx =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nUser ID: ${ctx.from?.id}`)
  )

  bot.on("message:text", ctx => {
    if (!ctx.message.text.startsWith("/")) {
      return ctx.reply("Usa /buscar para buscar ofertas.")
    }
  })

  setInterval(() => {
    if (chatId) scan(chatId)
  }, INTERVAL)

  console.log("[Amazon] Buscador automático preparado.")
}

