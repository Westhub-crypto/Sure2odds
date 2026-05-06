const handleSupportMessage = async (bot, chatId, adminId, text, msgId) => {
    await bot.sendMessage(adminId, `📩 **Support Ticket**\nFrom ID: \`${chatId}\`\n\nMessage:\n${text}`, { parse_mode: 'Markdown' });
    await bot.sendMessage(chatId, "✅ Your message has been sent to support. We will reply shortly.");
};

module.exports = { handleSupportMessage };
