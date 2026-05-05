const User = require("../models/User");
const bot = require("../bot");

exports.notify = async (code) => {
  const users = await User.find();

  for (let u of users) {
    if (code.type === "basic" || u.isVIP) {
      const msg =
        code.type === "basic"
          ? "📢 New Basic Code Available!"
          : "💎 New VIP Code Dropped!";

      if (code.image) {
        bot.sendPhoto(u.telegramId, code.image, { caption: msg });
      } else {
        bot.sendMessage(u.telegramId, msg);
      }
    }
  }
};
