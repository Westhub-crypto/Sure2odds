const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['basic', 'vip', 'rollover'], // Added 'rollover' to the allowed types
        required: true 
    },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Code', codeSchema);
