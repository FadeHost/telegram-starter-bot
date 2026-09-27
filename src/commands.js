import { InlineKeyboard } from "grammy"

export function registerCommands(bot) {
  // START
  bot.command("start", (ctx) =>
    ctx.reply(
      `🌸 HTZ FASHION မှ ကြိုဆိုပါတယ် 🌸

🎓 သင်တန်းအပ်ရန် - "သင်တန်းအပ်မယ်" လို့ ပို့ပေးပါ။

👗 အဝတ်အထည် အော်ဒါမှာရန် - "အော်ဒါမှာမယ်" လို့ ပို့ပေးပါ။`,
      {
        reply_markup: new InlineKeyboard().text("Ping me", "ping"),
      },
    ),
  )

  // HELP
  bot.command("help", (ctx) =>
    ctx.reply(
      `🌸 HTZ FASHION

🎓 သင်တန်းအပ်ရန် - သင်တန်းအပ်မယ်
👗 အော်ဒါမှာရန် - အော်ဒါမှာမယ်

/start - စတင်ရန်
/help - အကူအညီ
/ping - Bot စမ်းရန်
/id - ID ကြည့်ရန်`,
    ),
  )

  // PING
  bot.command("ping", (ctx) => ctx.reply("pong"))

  // ID
  bot.command("id", (ctx) =>
    ctx.reply(
      `Chat id: ${ctx.chat.id}\nYour id: ${ctx.from?.id ?? "unknown"}`,
    ),
  )

  // BUTTON
  bot.callbackQuery("ping", (ctx) =>
    ctx.answerCallbackQuery({ text: "pong" }),
  )

  // AUTO REPLY
  bot.on("message:text", (ctx) => {
    const text = ctx.message.text.trim()

    if (text.includes("သင်တန်းအပ်မယ်")) {
      return ctx.reply(
        `🎓 HTZ FASHION သင်တန်းအပ်ရန်

အမည် -
ဖုန်းနံပါတ် -
တက်ရောက်လိုသော သင်တန်း -

အချက်အလက်များကို ဖြည့်ပြီး ပို့ပေးပါ။`,
      )
    }

    if (text.includes("အော်ဒါမှာမယ်")) {
      return ctx.reply(
        `👗 HTZ FASHION အော်ဒါမှာရန်

အမည် -
ဖုန်းနံပါတ် -
လိုချင်သော အဝတ်အထည် -
အရောင် -
အရွယ်အစား -
အရေအတွက် -

အချက်အလက်များကို ဖြည့်ပြီး ပို့ပေးပါ။`,
      )
    }

    // မသိတဲ့စာကို ပြန်မပို့ပါ
  })
}
