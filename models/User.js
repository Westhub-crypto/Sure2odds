const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    fullName: String,
    country: String,
    currency: String,
    language: String,
    step: { type: String, default: 'start' },
    role: { type: String, enum: ['basic', 'vip', 'admin'], default: 'basic' },
    isBanned: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
