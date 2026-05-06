const calculateExpiryDate = (days = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

const generateReference = () => {
    return 'S2O_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

module.exports = { calculateExpiryDate, generateReference };
