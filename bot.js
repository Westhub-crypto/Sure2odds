require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const User = require("./models/User");
const Payment = require("./models/Payment");
const admin = require("./controllers/adminController");
const { mainMenu, adminMenu } = require("./utils/keyboards");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN = Number(process.env.ADMIN_ID);

let state = {};

// START
bot.onText(/\/start/, async (msg) => {
  const id = msg.chat.id;

  let user = await User.findOne({ telegramId: id });
  if (!user) user = await User.create({ telegramId: id });

  if (!user.registrationComplete) {
    state[id] = { step: 1 };
    return bot.sendMessage(id, "Enter Full Name:");
  }

  if (id === ADMIN) {
    return bot.sendMessage(id, "Admin Panel", adminMenu);
  }

  bot.sendMessage(id, "Welcome!", mainMenu);
});

// MESSAGE HANDLER
bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text;
  const photo = msg.photo;

  const user = await User.findOne({ telegramId: id });
  if (!user) return;

  if (user.isBanned) return bot.sendMessage(id, "You are banned.");

  // SUPPORT
  if (text === "📩 Support") {
    state[id] = { support: true };
    return bot.sendMessage(id, "Send message or image:");
  }

  if (state[id]?.support) {
    const file = photo ? photo[photo.length - 1].file_id : null;

    bot.sendMessage(ADMIN, `Support from ${user.fullName}`, {
      reply_markup: {
        inline_keyboard: [[{ text: "Reply", callback_data: `reply_${id}` }]]
      }
    });

    if (file) bot.sendPhoto(ADMIN, file);

    delete state[id];
    return bot.sendMessage(id, "Sent.");
  }

  // ADMIN ADD CODE
  if (id === ADMIN && text === "➕ Add Basic Code") {
    state[id] = { addCode: true, type: "basic" };
    return bot.sendMessage(id, "Send text or image");
  }

  if (id === ADMIN && text === "💎 Add VIP Code") {
    state[id] = { addCode: true, type: "vip" };
    return bot.sendMessage(id, "Send text or image");
  }

  if (id === ADMIN && state[id]?.addCode) {
    const file = photo ? photo[photo.length - 1].file_id : null;

    await admin.addCode(state[id].type, text || "Image Code", file);

    delete state[id];
    return bot.sendMessage(id, "Code added.");
  }

  // VIP PURCHASE (MANUAL)
  if (text === "💎 VIP") {
    state[id] = { payment: true };
    return bot.sendMessage(id,
`Bank: MoMo PSB
Number: 7049625916
Name: Godwin Owoicho Oloja

Send receipt after payment.`);
  }

  if (state[id]?.payment && photo) {
    const file = photo[photo.length - 1].file_id;

    const payment = await Payment.create({
      userId: user._id,
      method: "manual",
      status: "pending",
      receipt: file
    });

    bot.sendPhoto(ADMIN, file, {
      caption: `Payment from ${user.fullName}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_${payment._id}` },
            { text: "❌ Reject", callback_data: `reject_${payment._id}` }
          ]
        ]
      }
    });

    delete state[id];
    return bot.sendMessage(id, "Receipt sent. Await approval.");
  }
});

// CALLBACKS
bot.on("callback_query", async (q) => {
  const data = q.data;

  if (data.startsWith("approve_")) {
    const id = data.split("_")[1];
    const p = await Payment.findById(id);
    await admin.approveManual(p, bot);
  }

  if (data.startsWith("reject_")) {
    const id = data.split("_")[1];
    const p = await Payment.findById(id);
    await admin.rejectManual(p, bot);
  }

  if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];

    bot.sendMessage(ADMIN, "Type reply:");

    bot.once("message", (msg) => {
      bot.sendMessage(userId, msg.text);
    });
  }
});

module.exports = bot;
