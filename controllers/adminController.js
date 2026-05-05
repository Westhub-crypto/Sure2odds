const Code = require("../models/Code");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { notify } = require("../services/notificationService");

exports.addCode = async (type, text, image) => {
  const c = await Code.create({ type, content: text, image });
  await notify(c);
};

exports.approveManual = async (payment, bot) => {
  const user = await User.findById(payment.userId);
  user.isVIP = true;
  await user.save();

  const now = new Date();
  const expiry = new Date(now.getTime() + 30 * 86400000);

  await Subscription.create({
    userId: user._id,
    startDate: now,
    expiryDate: expiry
  });

  bot.sendMessage(user.telegramId, "✅ VIP Activated");
};

exports.rejectManual = async (payment, bot) => {
  const user = await User.findById(payment.userId);
  bot.sendMessage(user.telegramId, "❌ Payment rejected");
};
