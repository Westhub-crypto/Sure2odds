const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/User');
const Payment = require('./models/Payment');
const Code = require('./models/Code');
const Subscription = require('./models/Subscription');
const { getMainMenu, getRegistrationMenu, getAdminMenu } = require('./utils/keyboards');
const { checkAdmin } = require('./middlewares/adminMiddleware');
const { handleAdminPanel, handleStats } = require('./controllers/adminController');
const { processManualReceipt, handleAdminPaymentAction, handleSquadcoVerification } = require('./controllers/paymentController');
const { handleSupportMessage } = require('./controllers/supportController');
const { initializePayment } = require('./services/squadService');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = process.env.ADMIN_ID;

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text || '';
    const isAdmin = checkAdmin(chatId);
    
    let user = await User.findOne({ telegramId: chatId });

    if (text === '/start') {
        if (!user) user = new User({ telegramId: chatId });
        user.step = 'name';
        await user.save();

        const welcome = `👋 Welcome to Sure 2 Odds\n\nYour trusted platform for daily winning booking codes.\n\n🚀 Complete your registration.\nPlease enter your *Full Name*:`;
        return bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown', ...getRegistrationMenu('start') });
    }

    if (!user) return;

    // Admin Commands
    if (isAdmin && user.step === 'registered') {
        if (text === 'ADMIN') return handleAdminPanel(bot, chatId);
        if (text === '📊 Statistics') return handleStats(bot, chatId, User, Subscription);
        if (text === '⬅️ Back to Main Menu') return bot.sendMessage(chatId, "Main Menu", getMainMenu(isAdmin));
    }

    // Registration Flow
    if (user.step !== 'registered' && user.step !== 'awaiting_receipt' && user.step !== 'support') {
        if (text === '⬅️ Back') {
            if (user.step === 'country') user.step = 'name';
            else if (user.step === 'currency') user.step = 'country';
            else if (user.step === 'language') user.step = 'currency';
            await user.save();
            return bot.sendMessage(chatId, `Enter data:`, getRegistrationMenu(user.step));
        }

        switch (user.step) {
            case 'name': user.fullName = text; user.step = 'country'; break;
            case 'country': user.country = text; user.step = 'currency'; break;
            case 'currency': user.currency = text; user.step = 'language'; break;
            case 'language':
                user.language = text; user.step = 'registered';
                await user.save();
                return bot.sendMessage(chatId, "✅ Registration Complete!", getMainMenu(isAdmin));
        }
        await user.save();
        return bot.sendMessage(chatId, "Next:", getRegistrationMenu(user.step));
    }

    // Main Menu Interactivity
    if (user.step === 'registered') {
        
        if (text === 'FREE BOOKING CODE') {
            const code = await Code.findOne({ type: 'basic', isActive: true }).sort({ date: -1 });
            if (code) {
                return bot.sendMessage(chatId, `🎁 **Today's Free Booking Code**\n\n\`${code.content}\`\n\nGood luck! Play responsibly.`, { parse_mode: 'Markdown' });
            } else {
                return bot.sendMessage(chatId, "📌 **Update from Sure 2 Odds**\n\nThere are currently no free booking codes available at this moment.\nOur team of experts is meticulously analyzing the markets to provide you with the most accurate selections.\nPlease check back later.", { parse_mode: 'Markdown' });
            }
        }

        if (text === 'VIP CODE') {
            if (user.role !== 'vip' && user.role !== 'admin') {
                const upgradeMsg = `💎 **Exclusive VIP Access Required**\n\nOur VIP codes offer premium, high-odds selections with a consistent winning record.\nYou are currently on the Basic plan.\n\n**Price:** 5000 NGN / 30 Days\n\nPlease select your preferred payment method below to upgrade and unlock today's codes:`;
                return bot.sendMessage(chatId, upgradeMsg, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💳 Automatic Payment (Squadco)', callback_data: 'select_auto' }],
                            [{ text: '🏦 Manual Bank Transfer', callback_data: 'select_manual' }]
                        ]
                    }
                });
            } else {
                const code = await Code.findOne({ type: 'vip', isActive: true }).sort({ date: -1 });
                if (code) {
                    return bot.sendMessage(chatId, `💎 **Premium VIP Booking Code**\n\n\`${code.content}\`\n\nEnjoy your exclusive winnings!`, { parse_mode: 'Markdown' });
                } else {
                    return bot.sendMessage(chatId, "💎 **VIP Update**\n\nThere are currently no VIP booking codes available right now.\nWe are finalizing our premium selections to ensure the highest possible accuracy for our exclusive members.\nYou will be notified via broadcast as soon as the code drops.", { parse_mode: 'Markdown' });
                }
            }
        }

        if (text === 'PROFILE') {
            let roleDisplay = '🆓 BASIC';
            if (user.role === 'vip') roleDisplay = '💎 VIP';
            if (user.role === 'admin') roleDisplay = '👑 ADMIN';

            let profileMsg = `👤 **Your Profile Details**\n\n` +
                `**Name:** ${user.fullName}\n` +
                `**Account ID:** \`${user.telegramId}\`\n` +
                `**Country:** ${user.country}\n` +
                `**Currency:** ${user.currency}\n` +
                `**Language:** ${user.language}\n` +
                `**Status:** ${roleDisplay}\n`;

            if (user.role === 'vip') {
                const sub = await Subscription.findOne({ telegramId: chatId, status: 'active' });
                if (sub) {
                    profileMsg += `**VIP Expiry:** ${sub.expiryDate.toDateString()}\n`;
                }
            }
            return bot.sendMessage(chatId, profileMsg, { parse_mode: 'Markdown' });
        }

        if (text === 'SUPPORT') {
            bot.sendMessage(chatId, "📩 **Customer Support**\n\nPlease type your message and send it. Our administrative team will review your inquiry and get back to you shortly.");
            user.step = 'support';
            await user.save();
            return;
        }
    }

    // Awaiting Data Handlers
    if (user.step === 'awaiting_receipt' && msg.photo) {
        await processManualReceipt(bot, chatId, ADMIN_ID, msg.photo[msg.photo.length - 1].file_id);
    } else if (user.step === 'support') {
        await handleSupportMessage(bot, chatId, ADMIN_ID, text, msg.message_id);
        user.step = 'registered';
        await user.save();
    }
});

// Inline Button Handlers for Payments
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data;
    const msgId = query.message.message_id;

    if (data === 'select_manual') {
        const user = await User.findOne({ telegramId: chatId });
        user.step = 'awaiting_receipt';
        await user.save();
        
        const bankMsg = `🏦 **Manual Payment Details**\n\nPlease transfer exactly **5000 NGN** to:\n\n🏦 **Bank:** MoMo PSB\n🔢 **Account:** \`7049625916\`\n👤 **Name:** Godwin Owoicho Oloja\n\n📸 **IMPORTANT:** After paying, upload a screenshot of your payment receipt here.`;
        bot.sendMessage(chatId, bankMsg, { parse_mode: 'Markdown' });
    }

    if (data === 'select_auto') {
        bot.sendMessage(chatId, "🔄 Generating your secure payment link...");
        const paymentData = await initializePayment('user@sure2odds.com', 5000);
        
        if (paymentData) {
            const payment = new Payment({
                telegramId: chatId, amount: 5000, method: 'squadco', reference: paymentData.reference
            });
            await payment.save();

            bot.sendMessage(chatId, `💳 **Secure Squadco Payment**\n\nClick the button below to pay securely. Once completed, return here and click **"🔄 Verify Payment"**.`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💳 Pay Now', url: paymentData.checkoutUrl }],
                        [{ text: '🔄 Verify Payment', callback_data: `verify_sq_${payment._id}` }]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, "❌ Failed to generate payment link. Please try again later or use Manual Transfer.");
        }
    }

    if (data.startsWith('verify_sq_')) {
        const paymentId = data.replace('verify_sq_', '');
        const payment = await Payment.findById(paymentId);
        if (payment) await handleSquadcoVerification(bot, chatId, payment.reference, paymentId);
    }

    if (chatId === ADMIN_ID) {
        if (data.startsWith('approve_') || data.startsWith('reject_')) {
            const action = data.startsWith('approve_') ? 'approve' : 'reject';
            const paymentId = data.replace(`${action}_`, '');
            await handleAdminPaymentAction(bot, paymentId, action, chatId);
            bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId });
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

module.exports = bot;
