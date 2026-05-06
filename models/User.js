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

// We added 'sure2odds_users' at the end here!
// This forces MongoDB to create a brand new, clean collection ignoring old project rules.
module.exports = mongoose.model('User', userSchema, 'sure2odds_users');
