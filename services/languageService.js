const getGreeting = (language) => {
    return language === 'French' ? 'Bienvenue!' : 'Welcome!';
};
module.exports = { getGreeting };
