const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { calculateExpiryDate } = require('../utils/helpers');
const { verifyPayment } = require('../services/squadService');

const processManualReceipt = async (bot, chatId, adminId, photoId) => {
    const user = await User.findOne({ telegramId: chatId });
    
    const payment = new Payment({
        telegramId: chatId, amount: 5000, currency: user.currency,
        method: 'manual', receiptImageId: photoId
    });
    await payment.save();

    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Verify & Approve', callback_data: `approve_${payment._id}` }],
                [{ text: '❌ Reject', callback_data: `reject_${payment._id}` }]
            ]
        }
    };

    await bot.sendPhoto(adminId, photoId, {
        caption: `📄 <b>New Manual Payment Receipt</b>\n\n👤 <b>User:</b> ${user.fullName}\n🆔 <b>ID:</b> <code>${chatId}</code>\n💰 <b>Amount:</b> 5000 NGN\n\nPlease review the receipt and take action.`,
        parse_mode: 'HTML',
        ...adminKeyboard
    });
    
    await bot.sendMessage(chatId, "✅ Receipt submitted successfully! Admin is reviewing it now. You will be notified shortly.", { parse_mode: 'HTML' });
    user.step = 'registered';
    await user.save();
};

const handleAdminPaymentAction = async (bot, paymentId, action, adminChatId) => {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'pending') {
        return bot.sendMessage(adminChatId, "⚠️ This payment has already been processed.", { parse_mode: 'HTML' });
    }

    const user = await User.findOne({ telegramId: payment.telegramId });

    if (action === 'approve') {
        payment.status = 'approved';
        user.role = 'vip';
        
        await Subscription.findOneAndUpdate(
            { telegramId: user.telegramId },
            { userId: user._id, status: 'active', startDate: new Date(), expiryDate: calculateExpiryDate(30), notifiedDays: [] },
            { upsert: true, new: true }
        );
        
        await bot.sendMessage(user.telegramId, "🎉 <b>Payment Verified!</b>\n\nYour manual payment has been approved. You are now a 💎 <b>VIP Member</b> for 30 days! Enjoy your premium codes.", { parse_mode: 'HTML' });
        await bot.sendMessage(adminChatId, `✅ You approved ${user.fullName}'s payment.`, { parse_mode: 'HTML' });
        
    } else if (action === 'reject') {
        payment.status = 'rejected';
        await bot.sendMessage(user.telegramId, "❌ <b>Payment Rejected</b>\n\nYour recent payment receipt was reviewed and rejected. If you believe this is an error, please click 'SUPPORT' to contact us.", { parse_mode: 'HTML' });
        await bot.sendMessage(adminChatId, `❌ You rejected ${user.fullName}'s payment.`, { parse_mode: 'HTML' });
    }
    
    await payment.save();
    await user.save();
};

const handleSquadcoVerification = async (bot, chatId, reference, paymentId) => {
    bot.sendMessage(chatId, "🔄 Checking transaction status with Squadco... Please wait.", { parse_mode: 'HTML' });
    
    const payment = await Payment.findById(paymentId);
    if (payment && payment.status === 'approved') {
        return bot.sendMessage(chatId, "✅ Your payment was already verified. You are already a VIP!", { parse_mode: 'HTML' });
    }

    const isSuccessful = await verifyPayment(reference);

    if (isSuccessful) {
        if (payment) {
            payment.status = 'approved';
            await payment.save();
        }

        const user = await User.findOne({ telegramId: chatId });
        user.role = 'vip';
        await user.save();

        await Subscription.findOneAndUpdate(
            { telegramId: chatId },
            { userId: user._id, status: 'active', startDate: new Date(), expiryDate: calculateExpiryDate(30) },
            { upsert: true }
        );

        bot.sendMessage(chatId, "🎉 <b>Payment Successful!</b>\n\nSquadco has confirmed your payment. You are now a 💎 <b>VIP Member</b> for 30 days!", { parse_mode: 'HTML' });
    } else {
        bot.sendMessage(chatId, "⚠️ <b>Payment Not Confirmed Yet</b>\n\nWe couldn't verify your payment with Squadco at this moment. If you have already been debited, please wait a few minutes and try clicking 'Verify' again, or contact support.", { parse_mode: 'HTML' });
    }
};

module.exports = { processManualReceipt, handleAdminPaymentAction, handleSquadcoVerification };
