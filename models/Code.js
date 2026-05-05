const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  type: { type: String, enum: ["basic", "vip"] },
  content: String,
  image: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Code", schema);
