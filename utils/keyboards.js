exports.mainMenu = {
  reply_markup: {
    keyboard: [
      ["📊 Codes", "💎 VIP"],
      ["👤 Profile", "📩 Support"]
    ],
    resize_keyboard: true
  }
};

exports.adminMenu = {
  reply_markup: {
    keyboard: [
      ["➕ Add Basic Code", "💎 Add VIP Code"],
      ["📢 Broadcast", "📊 Stats"],
      ["💳 Manual Payments"]
    ],
    resize_keyboard: true
  }
};
