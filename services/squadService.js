const axios = require('axios');
const { generateReference } = require('../utils/helpers');

const SQUADCO_API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://api-v2.squadco.com' 
    : 'https://sandbox-api-v2.squadco.com';

const initializePayment = async (email, amountNGN) => {
    const reference = generateReference();
    try {
        const payload = {
            amount: amountNGN * 100, // Squadco expects kobo
            email: email || 'user@sure2odds.com',
            currency: 'NGN',
            initiate_type: 'inline',
            transaction_ref: reference,
            callback_url: process.env.WEBHOOK_URL + '/webhook/squadco'
        };

        const response = await axios.post(`${SQUADCO_API_URL}/transaction/initiate`, payload, {
            headers: { Authorization: `Bearer ${process.env.SQUADCO_SECRET_KEY}` }
        });

        return { checkoutUrl: response.data.data.checkout_url, reference: reference };
    } catch (error) {
        console.error('Squadco Init Error:', error.response ? error.response.data : error.message);
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
        console.error('Squadco Verify Error:', error.message);
        return false;
    }
};

module.exports = { initializePayment, verifyPayment };
