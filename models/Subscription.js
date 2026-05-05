const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  startDate: Date,
  expiryDate: Date
});

module.exports = mongoose.model("Subscription", schema);
