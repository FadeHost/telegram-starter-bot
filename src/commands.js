
import { InlineKeyboard } from "grammy"

const API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = "openrouter/free"

// ذاكرة مؤقتة لكل محادثة
const conversations = new Map()

const SYSTEM_PROMPT = `
You are JARVIS, a highly intelligent personal AI assistant.
Your Telegram bot name is Martian19.
Speak Arabic when the user speaks Arabic, and English when they speak English.
Use natural Egyptian Arabic when appropriate.
Be helpful, intelligent, respectful, concise and friendly.
You can help with technology, planning, research and everyday tasks.
Never claim you performed an action unless you actually did it.
`

export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply(
      "أهلاً بك! أنا JARVIS، مساعدك الذكي. 🤖\n\nاسألني أي سؤال بالعربي أو الإنجليزي.",
      {
        reply_markup: new InlineKeyboard().text("اختبرني 🚀", "ping"),
      },
    ),
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "أوامر JARVIS:\n/start تشغيل البوت\n/help المساعدة\n/ping اختبار الاتصال\n/reset مسح ذاكرة المحادثة\n\nأرسل لي أي سؤال وسأجيبك بالذكاء الاصطناعي."
    ),
  )

  bot.command("ping", (ctx) => ctx.reply("I'm online, sir. 🟢"))

  bot.command("reset", (ctx) => {
    conversations.delete(ctx.chat.id)
    return ctx.reply("تم مسح ذاكرة المحادثة. نبدأ من جديد! 🧠")
  })

  bot.callbackQuery("ping", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "JARVIS online!" })
    await ctx.reply("أنا جاهز يا سيدي! 🚀")
  })

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text

    if (text.startsWith("/")) return

    if (!API_KEY) {
      return ctx.reply("مفتاح الذكاء الاصطناعي غير موجود في إعدادات السيرفر.")
    }

    await ctx.replyWithChatAction("typing")

    const chatId = ctx.chat.id
    const history = conversations.get(chatId) || []

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: text },
    ]

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "X-Title": "JARVIS Martian19",
          },
          body: JSON.stringify({
            model: MODEL,
            messages,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        console.error("[AI] API error:", response.status, data)
        return ctx.reply(
          response.status === 429
            ? "وصلنا لحد الاستخدام المجاني مؤقتاً. حاول بعد قليل."
            : "حصلت مشكلة في الاتصال بعقل JARVIS. حاول مرة أخرى."
        )
      }

      const answer = data.choices?.[0]?.message?.content

      if (!answer || typeof answer !== "string") {
        return ctx.reply("لم يصلني رد واضح من نموذج الذكاء الاصطناعي.")
      }

      conversations.set(chatId, [
        ...history,
        { role: "user", content: text },
        { role: "assistant", content: answer },
      ].slice(-12))

      await ctx.reply(answer.slice(0, 4000))

    } catch (error) {
      console.error("[AI] Connection error:", error)
      await ctx.reply("تعذر الاتصال بالذكاء الاصطناعي. حاول مرة أخرى.")
    }
  })
}

import { InlineKeyboard } from "grammy";

// ======================================
// MARTIAN19 SUPER AGENT
// ======================================

const AI_KEY = process.env.OPENROUTER_API_KEY;
const SEARCH_KEY = process.env.TAVILY_API_KEY || "";

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const AI_URL = "https://openrouter.ai/api/v1/chat/completions";
const SEARCH_URL = "https://api.tavily.com/search";

const memory = new Map();
const busy = new Set();

const MAX_HISTORY = 16;
const MAX_TOOLS = 3;

const SYSTEM_PROMPT = `
You are MARTIAN19 SUPER AGENT, also known as JARVIS.

You are an advanced personal AI assistant.

IDENTITY:
Your name is JARVIS.
Your Telegram identity is MARTIAN19.
You are intelligent, calm, creative and professional.

LANGUAGE:
- Speak Egyptian Arabic when the user speaks Arabic.
- Speak English when the user speaks English.
- Understand both languages.
- Explain technical topics simply.

INTELLIGENCE:
- Analyze difficult problems.
- Create innovative ideas.
- Plan projects and business strategies.
- Help with programming and technology.
- Research and compare information.
- Explain your reasoning in clear steps.
- Use web search when current information is needed.

TOOLS:
You can use web_search to find current public information.
When you use search results, mention their sources.
Never invent search results.

AUTONOMY:
- Break complex requests into smaller tasks.
- Choose the appropriate tool when needed.
- Explain what you can and cannot do.
- Ask permission before external actions.
- Never claim an action was completed unless it really was.

PRIVACY:
Never ask users to reveal passwords, API keys or secret tokens.
Never expose private information.

Your mission is to be a genuinely useful personal AI assistant.
`;

// ======================================
// WEB SEARCH TOOL
// ======================================

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the public internet for current information, news, facts and research.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query"
          }
        },
        required: ["query"]
      }
    }
  }
];

async function webSearch(query) {
  if (!SEARCH_KEY) {
    return "Web search is not configured. TAVILY_API_KEY is missing.";
  }

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: SEARCH_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true
    })
  });

  if (!response.ok) {
    throw new Error("SEARCH_ERROR_" + response.status);
  }

  const data = await response.json();

  return JSON.stringify({
    answer: data.answer || "",
    results: (data.results || []).map(item => ({
      title: item.title,
      url: item.url,
      content: item.content
    }))
  });
}

// ======================================
// AI ENGINE + TOOL EXECUTION
// ======================================

async function callAI(messages) {
  if (!AI_KEY) {
    throw new Error("MISSING_AI_KEY");
  }

  let currentMessages = [...messages];

  for (let round = 0; round <= MAX_TOOLS; round++) {
    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "MARTIAN19 SUPER AGENT"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: currentMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1600
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[AI ERROR]", response.status, data);
      throw new Error("AI_ERROR_" + response.status);
    }

    const message = data.choices?.[0]?.message;

    if (!message) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    const calls = message.tool_calls || [];

    if (!calls.length) {
      return message.content || "I could not generate a response.";
    }

    currentMessages.push(message);

    for (const call of calls) {
      if (call.function?.name !== "web_search") {
        continue;
      }

      let args;

      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      let result;

      try {
        result = await webSearch(String(args.query || ""));
      } catch (error) {
        result = "Search failed: " + error.message;
      }

      currentMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result
      });
    }
  }

  return "I reached the maximum number of research steps. Please narrow your request.";
}

// ======================================
// MEMORY
// ======================================

function getMemory(chatId) {
  return memory.get(chatId) || [];
}

function saveMemory(chatId, history) {
  memory.set(chatId, history.slice(-MAX_HISTORY));
}

// ======================================
// TELEGRAM MESSAGE HELPERS
// ======================================

async function sendAnswer(ctx, answer) {
  const text = String(answer || "").trim();

  if (!text) {
    await ctx.reply("لم يصلني رد واضح.");
    return;
  }

  const chunks = [];
  let remaining = text;

  while (remaining.length > 4000) {
    let cut = remaining.lastIndexOf("\n", 4000);

    if (cut < 2000) cut = 4000;

    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);

  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}

// ======================================
// MAIN BOT
// ======================================

export function registerCommands(bot) {

  bot.command("start", async ctx => {
    await ctx.reply(
      "🚀 MARTIAN19 SUPER AGENT\n\n" +
      "أهلاً بك يا سيدي.\n" +
      "أنا JARVIS، مساعدك الذكي.\n\n" +
      "أستطيع مساعدتك في:\n" +
      "🧠 التفكير والتحليل\n" +
      "🌐 البحث على الإنترنت\n" +
      "💡 ابتكار الأفكار\n" +
      "💻 البرمجة والتكنولوجيا\n" +
      "📊 التخطيط والمشروعات\n" +
      "🌍 العربية والإنجليزية\n\n" +
      "اكتب /help لمعرفة الأوامر."
    );
  });

  bot.command("help", async ctx => {
    await ctx.reply(
      "MARTIAN19 COMMAND CENTER\n\n" +
      "/start - Start agent\n" +
      "/help - Help\n" +
      "/ping - Connection test\n" +
      "/status - System status\n" +
      "/reset - Clear conversation memory\n" +
      "/search موضوع - Search the web\n\n" +
      "يمكنك أيضًا التحدث معي بشكل طبيعي."
    );
  });

  bot.command("ping", async ctx => {
    await ctx.reply("JARVIS ONLINE 🟢");
  });

  bot.command("status", async ctx => {
    await ctx.reply(
      "MARTIAN19 SYSTEM STATUS\n\n" +
      "Telegram: ONLINE 🟢\n" +
      "AI Key: " + (AI_KEY ? "CONFIGURED 🟢" : "MISSING 🔴") + "\n" +
      "Web Search: " + (SEARCH_KEY ? "CONFIGURED 🟢" : "NOT CONFIGURED 🟡") + "\n" +
      "Model: " + MODEL + "\n" +
      "Memory: TEMPORARY"
    );
  });

  bot.command("reset", async ctx => {
    memory.delete(ctx.chat.id);
    await ctx.reply("تم مسح ذاكرة المحادثة. 🧠");
  });

  bot.command("search", async ctx => {
    const query = ctx.match?.trim();

    if (!query) {
      await ctx.reply("اكتب مثلًا: /search أحدث أخبار الذكاء الاصطناعي");
      return;
    }

    if (!SEARCH_KEY) {
      await ctx.reply("البحث غير مفعّل. نحتاج إضافة TAVILY_API_KEY.");
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");

      const results = await webSearch(query);

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Analyze these web search results and answer in the user's language. Include source URLs:\n" +
            results
        }
      ];

      const answer = await callAI(messages);
      await sendAnswer(ctx, answer);

    } catch (error) {
      console.error("[SEARCH COMMAND]", error);
      await ctx.reply("حدث خطأ أثناء البحث. حاول مرة أخرى.");
    }
  });

  // Ignore button callbacks that are not registered here.
  bot.callbackQuery("ping", async ctx => {
    await ctx.answerCallbackQuery({ text: "JARVIS ONLINE" });
    await ctx.reply("أنا جاهز يا سيدي! 🚀");
  });

  // Main AI conversation handler
  bot.on("message:text", async ctx => {
    const userText = ctx.message.text.trim();
    const chatId = ctx.chat.id;

    if (!userText || userText.startsWith("/")) return;

    if (busy.has(chatId)) {
      await ctx.reply("لحظة يا سيدي، أنا أعالج طلبك السابق.");
      return;
    }

    if (!AI_KEY) {
      await ctx.reply("مفتاح الذكاء الاصطناعي غير مضبوط.");
      return;
    }

    busy.add(chatId);

    try {
      await ctx.replyWithChatAction("typing");

      const history = getMemory(chatId);

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userText }
      ];

      const answer = await callAI(messages);

      saveMemory(chatId, [
        ...history,
        { role: "user", content: userText },
        { role: "assistant", content: answer }
      ]);

      await sendAnswer(ctx, answer);

    } catch (error) {
      console.error("[JARVIS ERROR]", error);

      if (error.message === "MISSING_AI_KEY") {
        await ctx.reply("مفتاح OpenRouter غير موجود.");
      } else if (error.message.includes("429")) {
        await ctx.reply("وصلنا لحد الاستخدام الحالي. حاول لاحقًا.");
      } else {
        await ctx.reply(
          "حدث خطأ أثناء تشغيل JARVIS. راجع سجل السيرفر."
        );
      }

    } finally {
      busy.delete(chatId);
    }
  });
}
import { InlineKeyboard, InputFile } from "grammy";

// ======================================
// IMAGE GENERATION
// ======================================

async function generateImage(prompt) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/images",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "bytedance-seed/seedream-4.5",
        prompt,
        n: 1
      }),
      signal: AbortSignal.timeout(120000)
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("[IMAGE ERROR]", response.status, data);
    throw new Error("IMAGE_API_ERROR");
  }

  const image = data.data?.[0]?.b64_json;

  if (!image) {
    throw new Error("IMAGE_NOT_RETURNED");
  }

  return Buffer.from(image, "base64");
}

// ======================================
// FILE GENERATION
// ======================================

async function generateFileContent(format, prompt) {
  const instructions = `
Create a complete ${format.toUpperCase()} file based on this request:

${prompt}

Rules:
- Return ONLY the file content.
- Do not add explanations outside the file.
- Do not wrap the content in Markdown code fences.
- Make the result complete and usable.
`;

  return await callAI([
    {
      role: "system",
      content: "You are a professional digital document creator."
    },
    {
      role: "user",
      content: instructions
    }
  ]);
}
function cleanFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 45) || "martian19_file";
}

  // ======================================
  // CREATE IMAGE
  // ======================================

  bot.command("image", async ctx => {
    const prompt = ctx.match?.trim();

    if (!prompt) {
      return ctx.reply(
        "اكتب وصف الصورة بعد الأمر.\n\n" +
        "مثال:\n/image A futuristic JARVIS AI robot in a cinematic blue laboratory"
      );
    }

    if (!AI_KEY) {
      return ctx.reply("مفتاح OpenRouter غير موجود.");
    }

    try {
      await ctx.replyWithChatAction("upload_photo");

      const image = await generateImage(prompt);

      await ctx.replyWithPhoto(
        new InputFile(image, "martian19.png"),
        {
          caption: "🎨 تم إنشاء الصورة بواسطة MARTIAN19 SUPER AGENT"
        }
      );

    } catch (error) {
      console.error("[IMAGE GENERATION]", error);
      await ctx.reply(
        "تعذر إنشاء الصورة. تحقق من رصيد OpenRouter وتوافر نموذج الصور."
      );
    }
  });

  // ======================================
  // CREATE DIGITAL FILE
  // ======================================

  bot.command("file", async ctx => {
    const input = ctx.match?.trim() || "";
    const firstSpace = input.indexOf(" ");

    if (firstSpace === -1) {
      return ctx.reply(
        "طريقة الاستخدام:\n" +
        "/file txt اكتب محتوى الملف\n" +
        "/file md أنشئ تقريرًا عن الذكاء الاصطناعي\n" +
        "/file json أنشئ قائمة مهام\n" +
        "/file csv أنشئ جدولًا للمبيعات\n" +
        "/file html أنشئ صفحة ويب بسيطة\n" +
        "/file js أنشئ برنامج JavaScript\n" +
        "/file py أنشئ برنامج Python"
      );
    }

    const format = input.slice(0, firstSpace).toLowerCase();
    const prompt = input.slice(firstSpace + 1).trim();

    const allowedFormats = [
      "txt", "md", "json", "csv",
      "html", "js", "py"
    ];

    if (!allowedFormats.includes(format)) {
      return ctx.reply(
        "الصيغة غير مدعومة حاليًا. استخدم: " +
        allowedFormats.join(", ")
      );
    }

    if (!prompt) {
      return ctx.reply("اكتب وصف الملف المطلوب.");
    }

    try {
      await ctx.replyWithChatAction("upload_document");

      const content = await generateFileContent(format, prompt);

      const buffer = Buffer.from(content, "utf8");

      if (buffer.length > 5 * 1024 * 1024) {
        return ctx.reply("الملف كبير جدًا. اطلب نسخة أصغر.");
      }

      const filename = `martian19_${Date.now()}.${format}`;

      await ctx.replyWithDocument(
        new InputFile(buffer, filename),
        {
          caption: `📁 تم إنشاء الملف بواسطة MARTIAN19\nالصيغة: ${format.toUpperCase()}`
        }
      );

    } catch (error) {
      console.error("[FILE GENERATION]", error);
      await ctx.reply("تعذر إنشاء الملف. حاول مرة أخرى.");
    }
  });
