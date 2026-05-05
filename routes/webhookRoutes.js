const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

router.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.event === "charge.success") {
    const payment = await Payment.findOne({ reference: data.data.reference });
    if (!payment) return res.sendStatus(200);

    payment.status = "success";
    await payment.save();

    const user = await User.findById(payment.userId);
    user.isVIP = true;
    await user.save();

    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 86400000);

    await Subscription.create({
      userId: user._id,
      startDate: now,
      expiryDate: expiry
    });
  }

  res.sendStatus(200);
});

module.exports = router;
