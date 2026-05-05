const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  telegramId: Number,
  fullName: String,
  country: String,
  currency: String,
  language: { type: String, default: "en" },
  isVIP: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  registrationComplete: { type: Boolean, default: false }
});

module.exports = mongoose.model("User", schema);
