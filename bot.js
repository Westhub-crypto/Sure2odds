require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const User = require("./models/User");
const Payment = require("./models/Payment");
const adminController = require("./controllers/adminController");

const {
  countryKeyboard,
  currencyKeyboard,
  languageKeyboard,
  mainMenu
} = require("./utils/keyboards");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = Number(process.env.ADMIN_ID);

/* =========================
   START COMMAND
========================= */
bot.onText(/\/start/, async (msg) => {
  const id = msg.chat.id;

  let user = await User.findOne({ telegramId: id });
  if (!user) user = await User.create({ telegramId: id });

  if (!user.registrationComplete) {
    user.step = 1;
    await user.save();

    return bot.sendMessage(
      id,
      "👋 Welcome to Sure 2 Odds\n\n" +
      "Enter Full Name:"
    );
  }

  if (id === ADMIN_ID) {
    return bot.sendMessage(id, "👑 Admin Panel");
  }

  return bot.sendMessage(id, "Welcome back!", mainMenu);
});

/* =========================
   MESSAGE HANDLER
========================= */
bot.on("message", async (msg) => {
  if (msg.text && msg.text.startsWith("/")) return;

  const id = msg.chat.id;
  const text = msg.text;
  const photo = msg.photo;

  let user = await User.findOne({ telegramId: id });
  if (!user) return;

  if (user.isBanned) {
    return bot.sendMessage(id, "❌ You are banned.");
  }

  /* =========================
     BACK BUTTON
  ========================= */
  if (text === "⬅️ Back") {
    if (user.step > 1) {
      user.step -= 1;
      await user.save();
    }
  }

  /* =========================
     REGISTRATION FLOW
  ========================= */

  // STEP 1 → NAME
  if (user.step === 1) {
    if (!text || text === "⬅️ Back") {
      return bot.sendMessage(id, "Enter Full Name:");
    }

    user.fullName = text;
    user.step = 2;
    await user.save();

    return bot.sendMessage(id, "Select Country:", countryKeyboard);
  }

  // STEP 2 → COUNTRY
  if (user.step === 2) {

    if (text === "🌍 Auto Detect") {
      const lang = msg.from.language_code;

      if (lang === "en") user.country = "Nigeria";
      else user.country = "Nigeria"; // fallback
    } 
    else if (text !== "⬅️ Back") {
      user.country = text;
    }

    user.step = 3;
    await user.save();

    return bot.sendMessage(id, "Select Currency:", currencyKeyboard);
  }

  // STEP 3 → CURRENCY
  if (user.step === 3) {
    if (text !== "⬅️ Back") {
      user.currency = text;
    }

    user.step = 4;
    await user.save();

    return bot.sendMessage(id, "Select Language:", languageKeyboard);
  }

  // STEP 4 → LANGUAGE
  if (user.step === 4) {
    if (text !== "⬅️ Back") {
      user.language = text;
    }

    user.step = 0;
    user.registrationComplete = true;
    await user.save();

    return bot.sendMessage(
      id,
      "✅ Registration Complete!",
      mainMenu
    );
  }

  /* =========================
     SUPPORT SYSTEM
  ========================= */
  if (text === "📩 Support") {
    user.step = 99;
    await user.save();

    return bot.sendMessage(id, "Send your message or image:");
  }

  if (user.step === 99) {
    const file = photo ? photo[photo.length - 1].file_id : null;

    bot.sendMessage(
      ADMIN_ID,
      `📩 Support from ${user.fullName}\nID: ${user.telegramId}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Reply", callback_data: `reply_${id}` }]
          ]
        }
      }
    );

    if (file) {
      bot.sendPhoto(ADMIN_ID, file);
    } else {
      bot.sendMessage(ADMIN_ID, text);
    }

    user.step = 0;
    await user.save();

    return bot.sendMessage(id, "✅ Message sent to admin.");
  }

  /* =========================
     ADMIN ADD CODE
  ========================= */
  if (id === ADMIN_ID && text === "➕ Add Basic Code") {
    user.step = 50;
    user.tempType = "basic";
    await user.save();

    return bot.sendMessage(id, "Send code text or image:");
  }

  if (id === ADMIN_ID && text === "💎 Add VIP Code") {
    user.step = 50;
    user.tempType = "vip";
    await user.save();

    return bot.sendMessage(id, "Send VIP code:");
  }

  if (id === ADMIN_ID && user.step === 50) {
    const file = photo ? photo[photo.length - 1].file_id : null;

    await adminController.addCode(
      user.tempType,
      text || "📷 Image Code",
      file
    );

    user.step = 0;
    await user.save();

    return bot.sendMessage(id, "✅ Code added.");
  }

  /* =========================
     VIP MANUAL PAYMENT
  ========================= */
  if (text === "💎 VIP") {
    user.step = 60;
    await user.save();

    return bot.sendMessage(
      id,
      "💳 Payment Details:\n\n" +
      "Bank: MoMo PSB\n" +
      "Number: 7049625916\n" +
      "Name: Godwin Owoicho Oloja\n\n" +
      "📸 Send receipt after payment."
    );
  }

  if (user.step === 60 && photo) {
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

    user.step = 0;
    await user.save();

    return bot.sendMessage(id, "✅ Receipt submitted. Await approval.");
  }
});

/* =========================
   CALLBACK HANDLER
========================= */
bot.on("callback_query", async (query) => {
  const data = query.data;

  if (data.startsWith("approve_")) {
    const id = data.split("_")[1];
    const payment = await Payment.findById(id);
    await adminController.approveManual(payment, bot);
  }

  if (data.startsWith("reject_")) {
    const id = data.split("_")[1];
    const payment = await Payment.findById(id);
    await adminController.rejectManual(payment, bot);
  }

  if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];

    bot.sendMessage(ADMIN_ID, "Type your reply:");

    bot.once("message", (msg) => {
      bot.sendMessage(userId, msg.text);
    });
  }
});

module.exports = bot;
