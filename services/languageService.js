const texts = {
  en: {
    welcome: "👋 Welcome to Sure 2 Odds",
    expired: "Your VIP subscription has expired."
  }
};

exports.t = (lang, key) => {
  return texts[lang]?.[key] || texts.en[key];
};
