const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    type: { type: String, enum: ['basic', 'vip'], required: true },
    content: { type: String, required: true },
    imageId: String,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Code', codeSchema);
