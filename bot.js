require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const User = require("./models/User");
const Payment = require("./models/Payment");
const adminController = require("./controllers/adminController");
const { mainMenu, adminMenu } = require("./utils/keyboards");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = Number(process.env.ADMIN_ID);

// In-memory state (for steps)
let state = {};

/* =========================
   START COMMAND
========================= */
bot.onText(/\/start/, async (msg) => {
  const id = msg.chat.id;

  let user = await User.findOne({ telegramId: id });
  if (!user) user = await User.create({ telegramId: id });

  // If not registered → start registration
  if (!user.registrationComplete) {
    state[id] = { step: 1 };

    return bot.sendMessage(
      id,
      "👋 Welcome to Sure 2 Odds\n\n" +
      "Your trusted platform for daily winning booking codes.\n\n" +
      "🎯 What you get:\n" +
      "- Free daily Basic Codes\n" +
      "- Premium VIP Codes with higher accuracy\n\n" +
      "💎 VIP Benefits:\n" +
      "- Exclusive high-odds selections\n" +
      "- Consistent winning opportunities\n" +
      "- Daily premium booking codes\n\n" +
      "🚀 Complete your registration to get started.\n\n" +
      "Enter Full Name:"
    );
  }

  // Admin panel
  if (id === ADMIN_ID) {
    return bot.sendMessage(id, "👑 Admin Panel", adminMenu);
  }

  // Normal user
  return bot.sendMessage(id, "Welcome back!", mainMenu);
});

/* =========================
   MESSAGE HANDLER
========================= */
bot.on("message", async (msg) => {
  // 🚫 Prevent duplicate handling of commands
  if (msg.text && msg.text.startsWith("/")) return;

  const id = msg.chat.id;
  const text = msg.text;
  const photo = msg.photo;

  let user = await User.findOne({ telegramId: id });
  if (!user) return;

  // 🚫 Block banned users
  if (user.isBanned) {
    return bot.sendMessage(id, "❌ You are banned.");
  }

  /* =========================
     REGISTRATION FLOW
  ========================= */
  if (state[id]?.step) {

    if (state[id].step === 1) {
      user.fullName = text;
      await user.save();

      state[id].step = 2;
      return bot.sendMessage(id, "Enter Country:");
    }

    if (state[id].step === 2) {
      user.country = text;
      await user.save();

      state[id].step = 3;
      return bot.sendMessage(id, "Enter Currency:");
    }

    if (state[id].step === 3) {
      user.currency = text;
      await user.save();

      state[id].step = 4;
      return bot.sendMessage(id, "Enter Language:");
    }

    if (state[id].step === 4) {
      user.language = text;
      user.registrationComplete = true;
      await user.save();

      delete state[id];

      return bot.sendMessage(id, "✅ Registration Complete!", mainMenu);
    }
  }

  /* =========================
     SUPPORT SYSTEM
  ========================= */
  if (text === "📩 Support") {
    state[id] = { support: true };
    return bot.sendMessage(id, "Send your message or image:");
  }

  if (state[id]?.support) {
    const file = photo ? photo[photo.length - 1].file_id : null;

    // Send to admin
    bot.sendMessage(ADMIN_ID, `📩 Support from ${user.fullName}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Reply", callback_data: `reply_${id}` }]
        ]
      }
    });

    if (file) {
      bot.sendPhoto(ADMIN_ID, file);
    } else {
      bot.sendMessage(ADMIN_ID, text);
    }

    delete state[id];

    return bot.sendMessage(id, "✅ Message sent to admin.");
  }

  /* =========================
     ADMIN PANEL ACTIONS
  ========================= */
  if (id === ADMIN_ID) {

    if (text === "➕ Add Basic Code") {
      state[id] = { addCode: true, type: "basic" };
      return bot.sendMessage(id, "Send code text or image:");
    }

    if (text === "💎 Add VIP Code") {
      state[id] = { addCode: true, type: "vip" };
      return bot.sendMessage(id, "Send VIP code:");
    }

    if (state[id]?.addCode) {
      const file = photo ? photo[photo.length - 1].file_id : null;

      await adminController.addCode(
        state[id].type,
        text || "📷 Image Code",
        file
      );

      delete state[id];

      return bot.sendMessage(id, "✅ Code added successfully.");
    }
  }

  /* =========================
     VIP MANUAL PAYMENT
  ========================= */
  if (text === "💎 VIP") {
    state[id] = { payment: true };

    return bot.sendMessage(
      id,
      "💳 Payment Details:\n\n" +
      "Bank: MoMo PSB\n" +
      "Number: 7049625916\n" +
      "Name: Godwin Owoicho Oloja\n\n" +
      "📸 Send payment receipt after transfer."
    );
  }

  if (state[id]?.payment && photo) {
    const file = photo[photo.length - 1].file_id;

    const payment = await Payment.create({
      userId: user._id,
      method: "manual",
      status: "pending",
      receipt: file
    });

    bot.sendPhoto(ADMIN_ID, file, {
      caption: `💳 Payment from ${user.fullName}`,
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

    return bot.sendMessage(id, "✅ Receipt submitted. Await approval.");
  }
});

/* =========================
   CALLBACK HANDLER
========================= */
bot.on("callback_query", async (query) => {
  const data = query.data;

  // Approve payment
  if (data.startsWith("approve_")) {
    const id = data.split("_")[1];
    const payment = await Payment.findById(id);

    await adminController.approveManual(payment, bot);
  }

  // Reject payment
  if (data.startsWith("reject_")) {
    const id = data.split("_")[1];
    const payment = await Payment.findById(id);

    await adminController.rejectManual(payment, bot);
  }

  // Reply to user
  if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];

    bot.sendMessage(ADMIN_ID, "Type your reply:");

    bot.once("message", (msg) => {
      bot.sendMessage(userId, msg.text);
    });
  }
});

module.exports = bot;
