const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Code = require('../models/Code');
const { sendMessageSafe } = require('../services/notificationService');
const { getDailyPromoMessage } = require('../services/marketingService');

const startCronJobs = (bot) => {
    // 1. AUTOMATIC CODE RESET (Every Midnight - Nigerian Time)
    cron.schedule('0 0 * * *', async () => {
        try {
            await Code.deleteMany({}); // Wipes all codes from the database
            console.log("🧹 MIDNIGHT RESET: All booking codes have been deleted successfully.");
        } catch (error) {
            console.error("❌ MIDNIGHT RESET ERROR:", error.message);
        }
    }, {
        scheduled: true,
        timezone: "Africa/Lagos" // Ensures it runs at exactly 12 AM your local time
    });

    // 2. VIP Expiry Check (Daily at Midnight)
    cron.schedule('0 0 * * *', async () => {
        const activeSubs = await Subscription.find({ status: 'active' });
        const now = new Date();

        for (const sub of activeSubs) {
            const daysLeft = Math.ceil((sub.expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) {
                sub.status = 'expired';
                await sub.save();
                await User.findByIdAndUpdate(sub.userId, { role: 'basic' });
                sendMessageSafe(bot, sub.telegramId, "⚠️ Your VIP subscription has expired. Please renew to continue accessing premium codes.");
            } else if ([5, 4, 3, 2, 1].includes(daysLeft) && !sub.notifiedDays.includes(daysLeft)) {
                sendMessageSafe(bot, sub.telegramId, `⏳ Reminder: Your VIP subscription expires in ${daysLeft} day(s).`);
                sub.notifiedDays.push(daysLeft);
                await sub.save();
            }
        }
    });

    // 3. Marketing Broadcast (Daily at 10 AM)
    cron.schedule('0 10 * * *', async () => {
        const basics = await User.find({ role: 'basic', step: 'registered' });
        const promoMsg = getDailyPromoMessage();
        basics.forEach(user => sendMessageSafe(bot, user.telegramId, promoMsg));
    });
};

module.exports = { startCronJobs };
