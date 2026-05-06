const axios = require('axios');
const { generateReference } = require('../utils/helpers');

// 🔥 FORCE the Live API URL to completely bypass any NODE_ENV variable mistakes
const SQUADCO_API_URL = 'https://api-v2.squadco.com';

const initializePayment = async (email, amountNGN) => {
    const reference = generateReference();
    try {
        console.log(`📡 Sending payment request to Squadco for ${amountNGN} NGN...`);
        
        // Ensure the Secret Key exists
        if (!process.env.SQUADCO_SECRET_KEY) {
            console.error("🚨 CRITICAL ERROR: SQUADCO_SECRET_KEY is missing from Render Environment Variables!");
            return null;
        }

        // Force a valid webhook URL even if the environment variable was forgotten
        const webhookUrl = process.env.WEBHOOK_URL 
            ? `${process.env.WEBHOOK_URL}/webhook/squadco` 
            : 'https://sure2odds.onrender.com/webhook/squadco';

        const payload = {
            amount: amountNGN * 100, // Squadco expects kobo (multiply by 100)
            email: email || 'user@sure2odds.com',
            currency: 'NGN',
            initiate_type: 'inline',
            transaction_ref: reference,
            callback_url: webhookUrl
        };

        const response = await axios.post(`${SQUADCO_API_URL}/transaction/initiate`, payload, {
            headers: { Authorization: `Bearer ${process.env.SQUADCO_SECRET_KEY}` }
        });

        console.log("✅ Squadco generated the link successfully!");
        return { checkoutUrl: response.data.data.checkout_url, reference: reference };
        
    } catch (error) {
        // 🔥 MASSIVE ERROR TRACKER: Prints the exact reason Squadco rejected the request
        console.error("❌ SQUADCO API REJECTED THE REQUEST!");
        if (error.response) {
            console.error("👉 Reason from Squadco:", JSON.stringify(error.response.data, null, 2));
            console.error("👉 Status Code:", error.response.status);
        } else {
            console.error("👉 Network Error:", error.message);
        }
        return null;
    }
};

const verifyPayment = async (reference) => {
    try {
        const response = await axios.get(`${SQUADCO_API_URL}/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${process.env.SQUADCO_SECRET_KEY}` }
        });
        return response.data.data.transaction_status === 'success';
    } catch (error) {
        console.error('❌ Squadco Verify Error:', error.message);
        return false;
    }
};

module.exports = { initializePayment, verifyPayment };
