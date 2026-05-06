const Code = require('../models/Code');
const { getAdminMenu } = require('../utils/keyboards');

const handleAdminPanel = async (bot, chatId) => {
    await bot.sendMessage(chatId, "👑 **Admin Dashboard**\nWelcome boss. What would you like to do?", Object.assign({ parse_mode: 'Markdown' }, getAdminMenu()));
};

const handleStats = async (bot, chatId, User, Subscription) => {
    const totalUsers = await User.countDocuments();
    const vips = await Subscription.countDocuments({ status: 'active' });
    await bot.sendMessage(chatId, `📊 **Platform Statistics**\n\nTotal Users: ${totalUsers}\nActive VIPs: ${vips}`, { parse_mode: 'Markdown' });
};

module.exports = { handleAdminPanel, handleStats };
