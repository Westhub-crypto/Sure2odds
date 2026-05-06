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

// 🔥 ANTI-GHOST WEBHOOK: Forces Telegram to send messages here
bot.deleteWebHook().then(() => {
    console.log('✅ Ghost webhooks cleared. Bot is actively listening for messages!');
}).catch(err => console.error('Webhook Clear Error:', err));

bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id.toString();
        const text = msg.text || '';
        
        // 🔥 TRACKER: This will print inside your Render Logs so we know it arrived
        console.log(`📩 Message received from ${chatId}: ${text}`);
        
        const isAdmin = checkAdmin(chatId);
        let user = await User.findOne({ telegramId: chatId });

        if (text === '/start') {
            if (!user) {
                user = new User({ telegramId: chatId });
            }
            user.step = 'name';
            await user.save(); // If MongoDB is blocking Render's IP, it will error out here safely

            // 🔥 CRASH-PROOF HTML: Switched from Markdown to HTML to prevent silent Telegram API crashes
            const welcome = `🌟 <b>Welcome to Sure 2 Odds</b> 🌟\n\nYour premier destination for expertly analyzed, high-accuracy booking codes.\n\nWhether you are looking to build consistency with our reliable <b>Free Daily Codes</b>, or maximize your profits with our exclusive <b>Premium VIP Selections</b>, you are in exactly the right place.\n\nTo ensure you get the best experience, let's set up your profile.\n\n📝 <b>Account Registration</b>\nPlease type and send your <b>Full Name</b> below to begin:`;
            
            return await bot.sendMessage(chatId, welcome, { parse_mode: 'HTML', ...getRegistrationMenu('start') });
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
                    return bot.sendMessage(chatId, `🎁 <b>Today's Free Booking Code</b>\n\n<code>${code.content}</code>\n\nGood luck! Play responsibly.`, { parse_mode: 'HTML' });
                } else {
                    return bot.sendMessage(chatId, "📌 <b>Update from Sure 2 Odds</b>\n\nThere are currently no free booking codes available at this moment.\nOur team of experts is meticulously analyzing the markets to provide you with the most accurate selections.\nPlease check back later.", { parse_mode: 'HTML' });
                }
            }

            if (text === 'VIP CODE') {
                if (user.role !== 'vip' && user.role !== 'admin') {
                    const upgradeMsg = `💎 <b>Exclusive VIP Access Required</b>\n\nOur VIP codes offer premium, high-odds selections with a consistent winning record.\nYou are currently on the Basic plan.\n\n<b>Price:</b> 5000 NGN / 30 Days\n\nPlease select your preferred payment method below to upgrade and unlock today's codes:`;
                    return bot.sendMessage(chatId, upgradeMsg, {
                        parse_mode: 'HTML',
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
                        return bot.sendMessage(chatId, `💎 <b>Premium VIP Booking Code</b>\n\n<code>${code.content}</code>\n\nEnjoy your exclusive winnings!`, { parse_mode: 'HTML' });
                    } else {
                        return bot.sendMessage(chatId, "💎 <b>VIP Update</b>\n\nThere are currently no VIP booking codes available right now.\nWe are finalizing our premium selections to ensure the highest possible accuracy for our exclusive members.\nYou will be notified via broadcast as soon as the code drops.", { parse_mode: 'HTML' });
                    }
                }
            }

            if (text === 'PROFILE') {
                let roleDisplay = '🆓 BASIC';
                if (user.role === 'vip') roleDisplay = '💎 VIP';
                if (user.role === 'admin') roleDisplay = '👑 ADMIN';

                let profileMsg = `👤 <b>Your Profile Details</b>\n\n` +
                    `<b>Name:</b> ${user.fullName}\n` +
                    `<b>Account ID:</b> <code>${user.telegramId}</code>\n` +
                    `<b>Country:</b> ${user.country}\n` +
                    `<b>Currency:</b> ${user.currency}\n` +
                    `<b>Language:</b> ${user.language}\n` +
                    `<b>Status:</b> ${roleDisplay}\n`;

                if (user.role === 'vip') {
                    const sub = await Subscription.findOne({ telegramId: chatId, status: 'active' });
                    if (sub) {
                        profileMsg += `<b>VIP Expiry:</b> ${sub.expiryDate.toDateString()}\n`;
                    }
                }
                return bot.sendMessage(chatId, profileMsg, { parse_mode: 'HTML' });
            }

            if (text === 'SUPPORT') {
                bot.sendMessage(chatId, "📩 <b>Customer Support</b>\n\nPlease type your message and send it. Our administrative team will review your inquiry and get back to you shortly.", { parse_mode: 'HTML' });
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

    } catch (error) {
        // 🔥 CRASH CATCHER: If anything fails, print the exact reason to the Render Logs!
        console.error("❌ BOT CRASHED DURING MESSAGE HANDLING:", error.message);
    }
});

// Inline Button Handlers for Payments
bot.on('callback_query', async (query) => {
    try {
        const chatId = query.message.chat.id.toString();
        const data = query.data;
        const msgId = query.message.message_id;

        if (data === 'select_manual') {
            const user = await User.findOne({ telegramId: chatId });
            user.step = 'awaiting_receipt';
            await user.save();
            
            const bankMsg = `🏦 <b>Manual Payment Details</b>\n\nPlease transfer exactly <b>5000 NGN</b> to:\n\n🏦 <b>Bank:</b> MoMo PSB\n🔢 <b>Account:</b> <code>7049625916</code>\n👤 <b>Name:</b> Godwin Owoicho Oloja\n\n📸 <b>IMPORTANT:</b> After paying, upload a screenshot of your payment receipt here.`;
            bot.sendMessage(chatId, bankMsg, { parse_mode: 'HTML' });
        }

        if (data === 'select_auto') {
            bot.sendMessage(chatId, "🔄 Generating your secure payment link...");
            const paymentData = await initializePayment('user@sure2odds.com', 5000);
            
            if (paymentData) {
                const payment = new Payment({
                    telegramId: chatId, amount: 5000, method: 'squadco', reference: paymentData.reference
                });
                await payment.save();

                bot.sendMessage(chatId, `💳 <b>Secure Squadco Payment</b>\n\nClick the button below to pay securely. Once completed, return here and click <b>"🔄 Verify Payment"</b>.`, {
                    parse_mode: 'HTML',
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
    } catch (error) {
        console.error("❌ CALLBACK ERROR:", error.message);
    }
});

module.exports = bot;
