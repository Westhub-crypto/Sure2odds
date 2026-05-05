const bot = require("../bot");
const User = require("../models/User");

const messages = [
  "🔥 Upgrade to VIP today and win big!",
  "💎 VIP users get higher odds daily!",
  "🚀 Don’t miss today’s premium code!",
  "🎯 Winning is easier with VIP!",
  "📈 Increase your chances with VIP!",
  "💰 More wins. More profit. Go VIP!",
  "⚡ Instant access to premium bets!",
  "🏆 VIP = Smart betting!",
  "🔥 Join winners club now!",
  "💎 Exclusive VIP codes daily!",
  "📊 Take betting to next level!",
  "🚀 Upgrade now!",
  "🎯 Serious bettors use VIP!",
  "💰 Make more money with VIP!",
  "🔥 Unlock premium odds!",
  "📈 Bet smarter, not harder!",
  "🏆 Don’t stay basic!",
  "💎 Premium codes waiting!",
  "⚡ VIP advantage is real!",
  "🚀 Start winning today!"
];

let index = 0;

exports.sendMarketing = async () => {
  const users = await User.find({ isVIP: false });
  const msg = messages[index];
  index = (index + 1) % messages.length;

  users.forEach(u => bot.sendMessage(u.telegramId, msg));
};
