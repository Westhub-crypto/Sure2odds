const handleSupportMessage = async (bot, msg, adminId) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text || msg.caption || '(No text provided)';
    
    // The inline reply button for the Admin
    const replyMarkup = {
        inline_keyboard: [
            [{ text: '↩️ Reply to User', callback_data: `support_reply_${chatId}` }]
        ]
    };

    const caption = `📩 <b>Support Ticket</b>\nFrom ID: <code>${chatId}</code>\n\n<b>Message:</b>\n${text}`;

    // If the user sends a photo (screenshot), forward it with the caption
    if (msg.photo) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        await bot.sendPhoto(adminId, photoId, {
            caption: caption,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        });
    } else {
        // Otherwise, just send the text
        await bot.sendMessage(adminId, caption, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        });
    }
};

module.exports = { handleSupportMessage };
