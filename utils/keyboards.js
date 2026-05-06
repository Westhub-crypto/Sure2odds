const getMainMenu = (isAdmin) => {
    const keyboard = [
        [{ text: 'FREE BOOKING CODE' }, { text: 'VIP CODE' }],
        [{ text: 'PROFILE' }, { text: 'SUPPORT' }]
    ];
    if (isAdmin) keyboard.push([{ text: 'ADMIN' }]);
    
    return { reply_markup: { keyboard, resize_keyboard: true, is_persistent: true } };
};

const getAdminMenu = () => {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '➕ Add Basic Code' }, { text: '➕ Add VIP Code' }],
                [{ text: '📢 Broadcast' }, { text: '⚙️ Change VIP Price' }],
                [{ text: '📊 Statistics' }, { text: '⬅️ Back to Main Menu' }]
            ],
            resize_keyboard: true
        }
    };
};

const getRegistrationMenu = (step) => {
    let keyboard = [];
    
    if (step === 'start' || step === 'name') {
        return { reply_markup: { remove_keyboard: true } };
    }

    if (step === 'country') {
        keyboard = [
            [{ text: '🇳🇬 Nigeria' }, { text: '🇬🇭 Ghana' }],
            [{ text: '🇨🇮 Ivory Coast' }, { text: '🇸🇳 Senegal' }],
            [{ text: '🇨🇲 Cameroon' }, { text: '🇧🇯 Benin' }]
        ];
    }
    
    if (step === 'currency') keyboard = [[{ text: 'USD' }, { text: 'NGN' }, { text: 'EUR' }, { text: 'GHS' }]];
    if (step === 'language') keyboard = [[{ text: 'English' }, { text: 'French' }]];
    
    keyboard.push([{ text: '⬅️ Back' }]);
    
    return { reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true } };
};

// 🔥 NEW VIP PAYMENT MENUS
const getVIPPaymentMenu = () => {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '💳 Automatic Payment' }, { text: '🏦 Manual Bank Transfer' }],
                [{ text: '⬅️ Return to Main Menu' }]
            ],
            resize_keyboard: true
        }
    };
};

const getManualPaymentMenu = () => {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '❌ Cancel' }, { text: '⬅️ Return to Main Menu' }]
            ],
            resize_keyboard: true
        }
    };
};

const getAutoPaymentMenu = () => {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '🔄 Verify Payment' }],
                [{ text: '❌ Cancel' }, { text: '⬅️ Return to Main Menu' }]
            ],
            resize_keyboard: true
        }
    };
};

module.exports = { getMainMenu, getAdminMenu, getRegistrationMenu, getVIPPaymentMenu, getManualPaymentMenu, getAutoPaymentMenu };
