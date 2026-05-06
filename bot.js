const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/User');
const Payment = require('./models/Payment');
const Code = require('./models/Code');
const Subscription = require('./models/Subscription');
const { getMainMenu, getRegistrationMenu, getAdminMenu, getVIPPaymentMenu, getManualPaymentMenu, getAutoPaymentMenu, getSupportMenu } = require('./utils/keyboards');
const { checkAdmin } = require('./middlewares/adminMiddleware');
const { handleAdminPanel, handleStats } = require('./controllers/adminController');
const { processManualReceipt, handleAdminPaymentAction } = require('./controllers/paymentController');
const { handleSupportMessage } = require('./controllers/supportController');
const { initializePayment, verifyPayment } = require('./services/squadService');
const { calculateExpiryDate } = require('./utils/helpers');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = process.env.ADMIN_ID;

console.log("🤖 Bot is starting up... verifying connection...");

bot.deleteWebHook().then(() => {
    console.log('✅ Ghost webhooks cleared. Bot is strictly using polling now!');
}).catch(err => console.error('⚠️ Webhook Clear Error:', err.message));

bot.on('polling_error', (error) => {
    console.error("❌ POLLING ERROR:", error.code, error.message);
});

bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id.toString();
        const text = msg.text || '';
        
        console.log(`📩 Message received from ${chatId}`);
        
        const isAdmin = checkAdmin(chatId);
        let user = await User.findOne({ telegramId: chatId });

        // 🔥 GLOBAL CANCEL: Instantly catches "Cancel" from ANY menu and brings them home
        if (text === '⬅️ Return to Main Menu' || text === '❌ Cancel') {
            if (user) {
                user.step = 'registered';
                await user.save();
                return bot.sendMessage(chatId, "🏡 <b>Returned to Main Menu</b>\n\nHow can we assist you today?", { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
            }
        }

        if (text === '/start') {
            if (user && user.step === 'registered') {
                const welcomeBack = `🌟 <b>Welcome back to Sure 2 Odds, ${user.fullName}!</b> 🌟\n\nUse the menu below to access your premium codes and profile.`;
                return bot.sendMessage(chatId, welcomeBack, { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
            }

            if (!user) user = new User({ telegramId: chatId });
            user.step = 'name';
            await user.save();

            const welcome = `🌟 <b>Welcome to Sure 2 Odds</b> 🌟\n\nYour premier destination for expertly analyzed, high-accuracy booking codes.\n\nWhether you are looking to build consistency with our reliable <b>Free Daily Codes</b>, or maximize your profits with our exclusive <b>Premium VIP Selections</b>, you are in exactly the right place.\n\nTo ensure you get the best experience, let's set up your profile.\n\n📝 <b>Account Registration</b>\nPlease type and send your <b>Full Name</b> below to begin:`;
            return await bot.sendMessage(chatId, welcome, { parse_mode: 'HTML', ...getRegistrationMenu('start') });
        }

        if (!user) return;

        // 🔥 ADMIN SUPPORT REPLY LOGIC: Routes admin's message back to the user
        if (isAdmin && user.step && user.step.startsWith('replying_to_')) {
            const targetUserId = user.step.replace('replying_to_', '');
            const adminResponsePrefix = `💬 <b>Message from Admin:</b>\n\n`;
            const contentText = msg.text || msg.caption || '';
            
            try {
                if (msg.photo) {
                     await bot.sendPhoto(targetUserId, msg.photo[msg.photo.length - 1].file_id, {
                         caption: adminResponsePrefix + contentText,
                         parse_mode: 'HTML'
                     });
                } else {
                     await bot.sendMessage(targetUserId, adminResponsePrefix + contentText, { parse_mode: 'HTML' });
                }
                bot.sendMessage(chatId, "✅ <b>Reply sent successfully to user!</b>", { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
            } catch (e) {
                bot.sendMessage(chatId, "⚠️ <b>Failed to send message. The user might have blocked the bot.</b>", { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
            }
            
            user.step = 'registered';
            await user.save();
            return;
        }

        // Admin Commands
        if (isAdmin && user.step === 'registered') {
            if (text === 'ADMIN') return handleAdminPanel(bot, chatId);
            if (text === '📊 Statistics') return handleStats(bot, chatId, User, Subscription);
        }

        const validCountries = ['🇳🇬 Nigeria', '🇬🇭 Ghana', '🇨🇮 Ivory Coast', '🇸🇳 Senegal', '🇨🇲 Cameroon', '🇧🇯 Benin'];
        const validCurrencies = ['USD', 'NGN', 'EUR', 'GHS'];
        const validLanguages = ['English', 'French'];

        // Registration Flow
        if (user.step !== 'registered' && user.step !== 'awaiting_receipt' && user.step !== 'support' && user.step !== 'vip_payment_selection' && user.step !== 'awaiting_auto_verify') {
            
            if (text === '⬅️ Back') {
                if (user.step === 'country') { 
                    user.step = 'name'; await user.save(); 
                    return bot.sendMessage(chatId, "📝 Please type and send your <b>Full Name</b>:", { parse_mode: 'HTML', ...getRegistrationMenu('start') }); 
                }
                if (user.step === 'currency') { 
                    user.step = 'country'; await user.save(); 
                    return bot.sendMessage(chatId, "🌍 <b>Country Selection</b>\nPlease select your country from the list below:", { parse_mode: 'HTML', ...getRegistrationMenu('country') }); 
                }
                if (user.step === 'language') { 
                    user.step = 'currency'; await user.save(); 
                    return bot.sendMessage(chatId, "💵 <b>Currency Selection</b>\nPlease select your preferred currency:", { parse_mode: 'HTML', ...getRegistrationMenu('currency') }); 
                }
            }

            if (user.step === 'name' && text !== '/start') {
                user.fullName = text; user.step = 'country'; await user.save();
                return bot.sendMessage(chatId, "🌍 <b>Country Selection</b>\n\nPlease select your country from the West African regions below:", { parse_mode: 'HTML', ...getRegistrationMenu('country') });
            }
            else if (user.step === 'country') {
                if (!validCountries.includes(text)) return bot.sendMessage(chatId, "⚠️ <b>Invalid Selection</b>\n\nPlease use the buttons below to select a valid country.", { parse_mode: 'HTML', ...getRegistrationMenu('country') });
                user.country = text; user.step = 'currency'; await user.save();
                return bot.sendMessage(chatId, "💵 <b>Currency Selection</b>\n\nPlease select your preferred currency for transactions:", { parse_mode: 'HTML', ...getRegistrationMenu('currency') });
            }
            else if (user.step === 'currency') {
                if (!validCurrencies.includes(text)) return bot.sendMessage(chatId, "⚠️ <b>Invalid Selection</b>\n\nPlease use the buttons below to select a valid currency.", { parse_mode: 'HTML', ...getRegistrationMenu('currency') });
                user.currency = text; user.step = 'language'; await user.save();
                return bot.sendMessage(chatId, "🗣️ <b>Language Selection</b>\n\nPlease select your preferred language:", { parse_mode: 'HTML', ...getRegistrationMenu('language') });
            }
            else if (user.step === 'language') {
                if (!validLanguages.includes(text)) return bot.sendMessage(chatId, "⚠️ <b>Invalid Selection</b>\n\nPlease use the buttons below to select a valid language.", { parse_mode: 'HTML', ...getRegistrationMenu('language') });
                user.language = text; user.step = 'registered'; await user.save();
                return bot.sendMessage(chatId, "✅ <b>Registration Complete!</b>\n\nYour profile has been successfully set up. Welcome to the Sure 2 Odds community!", { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
            }
            return; 
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
                    user.step = 'vip_payment_selection';
                    await user.save();
                    const upgradeMsg = `💎 <b>Exclusive VIP Access Required</b> 💎\n\nUnlock premium, high-odds selections backed by our experts' rigorous analysis. Elevate your winning consistency today!\n\n💵 <b>Subscription Plan:</b> 5000 NGN / 30 Days\n\n<i>Please select your preferred payment method from the menu below to proceed:</i>`;
                    return bot.sendMessage(chatId, upgradeMsg, { parse_mode: 'HTML', ...getVIPPaymentMenu() });
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
                    if (sub) profileMsg += `<b>VIP Expiry:</b> ${sub.expiryDate.toDateString()}\n`;
                }
                return bot.sendMessage(chatId, profileMsg, { parse_mode: 'HTML' });
            }

            if (text === 'SUPPORT') {
                bot.sendMessage(chatId, "📩 <b>Customer Support</b>\n\nPlease type your message and send it (You can also upload images). Our administrative team will review your inquiry and get back to you shortly.", { parse_mode: 'HTML', ...getSupportMenu() });
                user.step = 'support';
                await user.save();
                return;
            }
        }

        // --- VIP PAYMENT ROUTING ---
        if (user.step === 'vip_payment_selection') {
            if (text === '🏦 Manual Bank Transfer') {
                user.step = 'awaiting_receipt';
                await user.save();
                const bankMsg = `🏦 <b>Manual Bank Transfer Details</b> 🏦\n\nPlease proceed to transfer exactly <b>5000 NGN</b> to the account below:\n\n🏛 <b>Bank:</b> MoMo PSB\n🔢 <b>Account No:</b> <code>7049625916</code>\n👤 <b>Name:</b> Godwin Owoicho Oloja\n\n📸 <b>Action Required:</b> Once your transfer is successful, kindly upload the payment screenshot/receipt right here for rapid verification.`;
                return bot.sendMessage(chatId, bankMsg, { parse_mode: 'HTML', ...getManualPaymentMenu() });
            }
            
            if (text === '💳 Automatic Payment') {
                bot.sendMessage(chatId, "🔄 <b>Generating your secure payment link...</b>", { parse_mode: 'HTML' });
                const paymentData = await initializePayment('user@sure2odds.com', 5000);
                
                if (paymentData) {
                    const payment = new Payment({
                        telegramId: chatId, amount: 5000, method: 'squadco', reference: paymentData.reference
                    });
                    await payment.save();

                    user.step = 'awaiting_auto_verify';
                    await user.save();

                    const autoMsg = `🌐 <b>Secure Online Payment</b> 🌐\n\nClick the secure link below to complete your VIP payment via Squadco:\n\n🔗 ${paymentData.checkoutUrl}\n\n<i>Once you have completed the payment on the website, return to this chat and press the <b>"🔄 Verify Payment"</b> button below.</i>`;
                    return bot.sendMessage(chatId, autoMsg, { parse_mode: 'HTML', ...getAutoPaymentMenu() });
                } else {
                    return bot.sendMessage(chatId, "❌ <b>Failed to generate payment link.</b>\n\nPlease try again later or use the Manual Bank Transfer method.", { parse_mode: 'HTML' });
                }
            }
        }

        if (user.step === 'awaiting_auto_verify' && text === '🔄 Verify Payment') {
            bot.sendMessage(chatId, "🔄 <b>Checking transaction status with Squadco... Please wait.</b>", { parse_mode: 'HTML' });
            
            const payment = await Payment.findOne({ telegramId: chatId, method: 'squadco', status: 'pending' }).sort({ createdAt: -1 });

            if (!payment) {
                return bot.sendMessage(chatId, "⚠️ No pending payment found. Please generate a new link or contact support.", { parse_mode: 'HTML' });
            }

            const isSuccessful = await verifyPayment(payment.reference);

            if (isSuccessful) {
                payment.status = 'approved';
                await payment.save();

                user.role = 'vip';
                user.step = 'registered';
                await user.save();

                await Subscription.findOneAndUpdate(
                    { telegramId: chatId },
                    { userId: user._id, status: 'active', startDate: new Date(), expiryDate: calculateExpiryDate(30) },
                    { upsert: true }
                );

                return bot.sendMessage(chatId, "🎉 <b>Payment Successful!</b> 🎉\n\nSquadco has confirmed your payment. You are now a 💎 <b>VIP Member</b> for 30 days! Welcome to the elite tier.", { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
            } else {
                return bot.sendMessage(chatId, "⚠️ <b>Payment Not Confirmed Yet</b>\n\nWe couldn't verify your payment with Squadco at this moment. If you have already been debited, please wait a few minutes and try clicking 'Verify' again, or select 'Cancel' to return.", { parse_mode: 'HTML' });
            }
        }

        // --- DATA SUBMISSIONS (Receipts & Support) ---
        if (user.step === 'awaiting_receipt') {
            if (msg.photo) {
                await processManualReceipt(bot, chatId, ADMIN_ID, msg.photo[msg.photo.length - 1].file_id);
            } else {
                bot.sendMessage(chatId, "⚠️ <b>Action Required:</b> Please upload a photo of your receipt.", { parse_mode: 'HTML' });
            }
            return;
        }

        if (user.step === 'support') {
            await handleSupportMessage(bot, msg, ADMIN_ID);
            user.step = 'registered';
            await user.save();
            return bot.sendMessage(chatId, "✅ <b>Message Sent!</b>\n\nOur administrative team will review your inquiry and get back to you shortly. Returning to Main Menu.", { parse_mode: 'HTML', ...getMainMenu(isAdmin) });
        }

    } catch (error) {
        console.error("❌ BOT CRASHED DURING MESSAGE HANDLING:", error.message);
    }
});

// Admin Inline Button Handlers
bot.on('callback_query', async (query) => {
    try {
        const chatId = query.message.chat.id.toString();
        const data = query.data;
        const msgId = query.message.message_id;

        if (chatId === ADMIN_ID) {
            // Payment Approvals
            if (data.startsWith('approve_') || data.startsWith('reject_')) {
                const action = data.startsWith('approve_') ? 'approve' : 'reject';
                const paymentId = data.replace(`${action}_`, '');
                const { handleAdminPaymentAction } = require('./controllers/paymentController');
                await handleAdminPaymentAction(bot, paymentId, action, chatId);
                bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId });
            }
            
            // 🔥 NEW: Support Reply Trigger
            if (data.startsWith('support_reply_')) {
                const targetUserId = data.replace('support_reply_', '');
                const adminUser = await User.findOne({ telegramId: chatId });
                
                adminUser.step = `replying_to_${targetUserId}`;
                await adminUser.save();
                
                bot.sendMessage(chatId, `✍️ <b>Replying to Ticket</b>\n\nPlease type your message for ID <code>${targetUserId}</code> now.\n\n<i>You can send text or an image.</i>`, { 
                    parse_mode: 'HTML', 
                    reply_markup: {
                        keyboard: [[{ text: '❌ Cancel' }, { text: '⬅️ Return to Main Menu' }]],
                        resize_keyboard: true
                    }
                });
            }
        }
        bot.answerCallbackQuery(query.id);
    } catch (error) {
        console.error("❌ CALLBACK ERROR:", error.message);
    }
});

module.exports = bot;
