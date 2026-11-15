// استخراج الاختيارات
function parseOption(line) {
  const match = line.match(
    /^\s*(?:\(([A-Za-zأ-ي0-9٠-٩]+)\)|([A-Za-zأ-ي0-9٠-٩]+)[.)\-:])\s*(.+?)\s*$/
  );

  if (!match) return null;

  const raw = match[3];

  return {
    text: raw.replace(/✅|✔️|✓/g, "").trim(),
    correct: /✅|✔️|✓/.test(raw)
  };
}

// التعرف على بداية الشرح
function isExplanation(line) {
  return /^(explanation|explain|why|الشرح|شرح|التوضيح|التفسير|لماذا)\s*[:：\-]?\s*/i.test(line);
}

// تحليل الأسئلة
function parseQuestions(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const questions = [];

  let title = [];
  let options = [];
  let explanation = [];
  let readingExplanation = false;

  function save() {
    if (title.length && options.length >= 2 && options.length <= 12) {
      const correct = options.filter(o => o.correct);

      if (correct.length === 1) {
        questions.push({
          title: title.join(" ").trim(),
          options,
          correct: options.findIndex(o => o.correct),
          explanation: explanation.join(" ").trim()
        });
      }
    }

    title = [];
    options = [];
    explanation = [];
    readingExplanation = false;
  }

  for (const original of lines) {
    const line = original.trim();

    if (!line) continue;

    const option = parseOption(line);

    // بداية سؤال جديد بصيغة Q1 أو Question 1 أو سؤال 1
    if (
      options.length >= 2 &&
      /^(?:Q(?:uestion)?|سؤال)\s*[0-9٠-٩]+\s*[.)\-:]/i.test(line)
    ) {
      save();
      title.push(line.replace(/^(?:Q(?:uestion)?|سؤال)\s*[0-9٠-٩]+\s*[.)\-:]\s*/i, ""));
      continue;
    }

    if (option && title.length) {
      options.push(option);
      continue;
    }

    if (options.length === 0) {
      title.push(line);
      continue;
    }

    if (isExplanation(line)) {
      readingExplanation = true;
      explanation.push(
        line.replace(/^(explanation|explain|why|الشرح|شرح|التوضيح|التفسير|لماذا)\s*[:：\-]?\s*/i, "")
      );
      continue;
    }

    if (readingExplanation || options.length >= 2) {
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
      "مرحباً بك في بوت الاختبارات التعليمية 🤖\n\n" +
      "أرسل الأسئلة مع الاختيارات، وضع ✅ بجانب الإجابة الصحيحة.\n" +
      "يمكنك إضافة الشرح أسفل الاختيارات.\n\n" +
      "أرسل /help لمعرفة طريقة الاستخدام."
    )
  );

  bot.command("help", ctx =>
    ctx.reply(
      "مثال على طريقة إرسال السؤال:\n\n" +
      "What is the powerhouse of the cell?\n\n" +
      "A. Nucleus\n" +
      "B. Mitochondria ✅\n" +
      "C. Ribosome\n" +
      "D. Golgi apparatus\n\n" +
      "Explanation: Mitochondria produce ATP.\n\n" +
      "يمكنك إرسال عدة أسئلة مرقمة بصيغة Q1 وQ2.\n" +
      "كل سؤال يتحول إلى استفتاء مستقل.\n\n" +
      "ضع ✅ بجانب إجابة واحدة صحيحة."
    )
  );

  bot.command("ping", ctx => ctx.reply("البوت يعمل بنجاح ✅"));

  bot.command("id", ctx =>
    ctx.reply(`Chat ID: ${ctx.chat.id}`)
  );

  bot.on("message:text", async ctx => {
    const message = ctx.message.text;

    if (message.startsWith("/")) return;

    const questions = parseQuestions(message);

    if (!questions.length) {
      return ctx.reply(
        "لم أتمكن من استخراج الأسئلة.\n\n" +
        "تأكد من وجود اختيارين على الأقل، " +
        "وضع ✅ بجانب إجابة واحدة صحيحة."
      );
    }

    await ctx.reply(
      `تم استخراج ${questions.length} سؤالاً. جاري إنشاء الاستفتاءات...`
    );

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
            is_anonymous: true
          }
        );

        success++;
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error("Poll error:", error);
        failed++;
      }
    }

    await ctx.reply(
      `انتهى إنشاء الاستفتاءات ✅\n\n` +
      `نجح: ${success}\n` +
      `فشل: ${failed}`
    );
  });
}