const checkAdmin = (chatId) => {
    return chatId.toString() === process.env.ADMIN_ID;
};

module.exports = { checkAdmin };
