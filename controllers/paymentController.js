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
        caption: `📄 **New Manual Payment Receipt**\n\n👤 **User:** ${user.fullName}\n🆔 **ID:** \`${chatId}\`\n💰 **Amount:** 5000 NGN\n\nPlease review the receipt and take action.`,
        parse_mode: 'Markdown',
        ...adminKeyboard
    });
    
    await bot.sendMessage(chatId, "✅ Receipt submitted successfully! Admin is reviewing it now. You will be notified shortly.");
    user.step = 'registered';
    await user.save();
};

const handleAdminPaymentAction = async (bot, paymentId, action, adminChatId) => {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'pending') {
        return bot.sendMessage(adminChatId, "⚠️ This payment has already been processed.");
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
        
        await bot.sendMessage(user.telegramId, "🎉 **Payment Verified!**\n\nYour manual payment has been approved. You are now a 💎 **VIP Member** for 30 days! Enjoy your premium codes.");
        await bot.sendMessage(adminChatId, `✅ You approved ${user.fullName}'s payment.`);
        
    } else if (action === 'reject') {
        payment.status = 'rejected';
        await bot.sendMessage(user.telegramId, "❌ **Payment Rejected**\n\nYour recent payment receipt was reviewed and rejected. If you believe this is an error, please click 'SUPPORT' to contact us.");
        await bot.sendMessage(adminChatId, `❌ You rejected ${user.fullName}'s payment.`);
    }
    
    await payment.save();
    await user.save();
};

const handleSquadcoVerification = async (bot, chatId, reference, paymentId) => {
    bot.sendMessage(chatId, "🔄 Checking transaction status with Squadco... Please wait.");
    
    const payment = await Payment.findById(paymentId);
    if (payment && payment.status === 'approved') {
        return bot.sendMessage(chatId, "✅ Your payment was already verified. You are already a VIP!");
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

        bot.sendMessage(chatId, "🎉 **Payment Successful!**\n\nSquadco has confirmed your payment. You are now a 💎 **VIP Member** for 30 days!");
    } else {
        bot.sendMessage(chatId, "⚠️ **Payment Not Confirmed Yet**\n\nWe couldn't verify your payment with Squadco at this moment. If you have already been debited, please wait a few minutes and try clicking 'Verify' again, or contact support.");
    }
};

module.exports = { processManualReceipt, handleAdminPaymentAction, handleSquadcoVerification };
