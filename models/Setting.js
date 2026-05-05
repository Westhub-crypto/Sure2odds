const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  vipPriceNGN: { type: Number, default: 5000 }
});

module.exports = mongoose.model("Setting", schema);
