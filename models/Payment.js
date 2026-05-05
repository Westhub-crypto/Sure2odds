const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  method: String,
  status: String,
  reference: String,
  receipt: String
});

module.exports = mongoose.model("Payment", schema);
