const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { calculateExpiryDate } = require('../utils/helpers');
const { verifyPayment } = require('../services/squadService');

router.post('/squadco', async (req, res) => {
    const event = req.body;
    
    if (event.Event === 'charge.completed' && event.Body.status === 'success') {
        const telegramId = event.Body.meta.telegramId;
        const reference = event.Body.transaction_ref;
        
        const isValid = await verifyPayment(reference);
        if (isValid) {
            const user = await User.findOne({ telegramId });
            if (user) {
                user.role = 'vip';
                await user.save();
                
                await Subscription.findOneAndUpdate(
                    { telegramId },
                    { userId: user._id, status: 'active', startDate: new Date(), expiryDate: calculateExpiryDate(30) },
                    { upsert: true }
                );
            }
        }
    }
    res.status(200).send('OK');
});

module.exports = router;
