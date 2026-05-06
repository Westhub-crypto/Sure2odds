const sendMessageSafe = async (bot, chatId, text, options = {}) => {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (error) {
        console.error(`Message Error for ${chatId}:`, error.message);
    }
};

module.exports = { sendMessageSafe };
