const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    telegramId: String,
    amount: Number,
    currency: String,
    method: { type: String, enum: ['squadco', 'manual'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    receiptImageId: String,
    reference: String
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
