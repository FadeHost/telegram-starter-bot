import { InlineKeyboard } from "grammy";

// استخراج الاختيارات من صيغ ترقيم مختلفة
function parseOption(line) {
  const match = line.match(
    /^\s*(?:\(([A-Za-zأ-ي0-9]+)\)|([A-Za-zأ-ي0-9]+)[.)\-:])\s*(.+?)\s*$/
  );

  if (!match) return null;

  return {
    text: match[3].trim(),
    correct: /✅|✔️|✓/.test(match[3]),
  };
}

// التعرف على سطر الشرح
function isExplanation(line) {
  return /^(explanation|explain|why|الشرح|شرح|التوضيح|التفسير|لماذا)\s*[:：\-]?\s*/i.test(line);
}

// تحليل الأسئلة
function parseQuestions(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const questions = [];

  let question = [];
  let options = [];
  let explanation = [];
  let readingExplanation = false;

  function save() {
    if (question.length && options.length >= 2) {
      const correct = options.filter(o => o.correct);

      if (correct.length === 1 && options.length <= 10) {
        questions.push({
          title: question.join(" "),
          options,
          correct: options.findIndex(o => o.correct),
          explanation: explanation.join(" ").trim(),
        });
      }
    }

    question = [];
    options = [];
    explanation = [];
    readingExplanation = false;
  }

  for (const line of lines) {
    const option = parseOption(line);

    if (option) {
      if (readingExplanation) {
        readingExplanation = false;
      }

      options.push(option);
      continue;
    }

    if (options.length === 0) {
      question.push(line);
      continue;
    }

    if (isExplanation(line)) {
      readingExplanation = true;
      explanation.push(
        line.replace(
          /^(explanation|explain|why|الشرح|شرح|التوضيح|التفسير|لماذا)\s*[:：\-]?\s*/i,
          ""
        )
      );
      continue;
    }

    // بداية سؤال جديد مرقم
    if (/^(?:Q(?:uestion)?\s*)?\d+\s*[.)\-:]/i.test(line)) {
      save();
      question.push(line.replace(/^(?:Q(?:uestion)?\s*)?\d+\s*[.)\-:]\s*/i, ""));
      continue;
    }

    if (readingExplanation) {
      explanation.push(line);
    } else {
      explanation.push(line);
      readingExplanation = true;
    }
  }

  save();

  return questions;
}

export function registerCommands(bot) {

  bot.command("start", ctx =>
    ctx.reply(
      "مرحباً بك في بوت الاستفتاءات التعليمية 🤖\n\n" +
      "أرسل الأسئلة مع الاختيارات، وضع ✅ بجانب الإجابة الصحيحة.\n" +
      "يمكنك إضافة الشرح أسفل الاختيارات.\n\n" +
      "أرسل /help لمعرفة طريقة الاستخدام."
    )
  );

  bot.command("help", ctx =>
    ctx.reply(
      "طريقة الاستخدام:\n\n" +
      "What is the powerhouse of the cell?\n\n" +
      "A. Nucleus\n" +
      "B. Mitochondria ✅\n" +
      "C. Ribosome\n" +
      "D. Golgi apparatus\n\n" +
      "Explanation: Mitochondria produce ATP.\n\n" +
      "يمكنك إرسال عدة أسئلة في رسالة واحدة.\n" +
      "كل سؤال يتحول إلى استفتاء مستقل.\n\n" +
      "الشروط:\n" +
      "• من 2 إلى 10 اختيارات.\n" +
      "• ضع ✅ بجانب إجابة واحدة صحيحة.\n" +
      "• يمكنك استخدام العربية أو الإنجليزية."
    )
  );

  bot.command("ping", ctx => ctx.reply("البوت يعمل بنجاح ✅"));

  bot.command("id", ctx =>
    ctx.reply(`Chat ID: ${ctx.chat.id}`)
  );

  bot.on("message:text", async ctx => {
    const text = ctx.message.text;

    if (text.startsWith("/")) return;

    const questions = parseQuestions(text);

    if (!questions.length) {
      return ctx.reply(
        "لم أتمكن من استخراج الأسئلة.\n\n" +
        "تأكد من وضع الاختيارات، ووضع ✅ بجانب إجابة واحدة صحيحة."
      );
    }

    await ctx.reply(`تم استخراج ${questions.length} سؤالاً. جاري إنشاء الاستفتاءات...`);

    let success = 0;
    let failed = 0;

    for (const q of questions) {
      try {
        await ctx.api.sendPoll(
          ctx.chat.id,
          q.title.slice(0, 300),
          q.options.map(o => o.text.slice(0, 100)),
          {
            type: "quiz",
            correct_option_id: q.correct,
            explanation: q.explanation.slice(0, 200) || undefined,
            is_anonymous: true,
          }
        );

        success++;

        await new Promise(resolve => setTimeout(resolve, 400));

      } catch (error) {
        console.error("Poll error:", error);
        failed++;
      }
    }

    await ctx.reply(
      `انتهى النشر! ✅\n\n` +
      `نجح: ${success}\n` +
      `فشل: ${failed}`
    );
  });
      }
