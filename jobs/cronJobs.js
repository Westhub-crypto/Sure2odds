const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const bot = require("../bot");
const Code = require("../models/Code");
const { sendMarketing } = require("../services/marketingService");

// RESET DAILY
cron.schedule("0 0 * * *", async () => {
  await Code.deleteMany();
});

// MARKETING DAILY
cron.schedule("0 12 * * *", async () => {
  await sendMarketing();
});

// EXPIRY + REMINDERS
cron.schedule("0 9 * * *", async () => {
  const subs = await Subscription.find();

  for (let s of subs) {
    const user = await User.findById(s.userId);
    const diff = Math.ceil((s.expiryDate - new Date()) / 86400000);

    if ([5,4,3,2,1].includes(diff)) {
      bot.sendMessage(user.telegramId, `⏳ ${diff} days left`);
    }

    if (diff <= 0) {
      user.isVIP = false;
      await user.save();
      bot.sendMessage(user.telegramId, "Your VIP subscription has expired.");
    }
  }
});
