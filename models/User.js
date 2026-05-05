const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  telegramId: Number,
  fullName: String,
  country: String,
  currency: String,
  language: String,

  step: { type: Number, default: 0 }, // ✅ step tracking

  isVIP: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  registrationComplete: { type: Boolean, default: false }
});

module.exports = mongoose.model("User", schema);
