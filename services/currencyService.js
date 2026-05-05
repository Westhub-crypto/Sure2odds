const axios = require("axios");

exports.convert = async (amountNGN, currency) => {
  try {
    const res = await axios.get("https://open.er-api.com/v6/latest/NGN");
    const rate = res.data.rates[currency] || 1;
    return (amountNGN * rate).toFixed(2);
  } catch {
    return amountNGN;
  }
};
