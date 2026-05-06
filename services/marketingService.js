const getDailyPromoMessage = () => {
    const messages = [
        "Dear member, we noticed you are still on our Basic tier. While our free codes provide a glimpse into our capabilities, our VIP selections offer a highly curated, analytical approach to ensure maximum accuracy. Take the leap today and join an exclusive group of winners.",
        "Consistency is the key to successful booking, and our VIP members experience this firsthand. By upgrading to VIP, you gain access to our most heavily researched and confident odds every single day. Do not leave your success to chance; upgrade your account now.",
        "Are you tired of near-misses and unreliable odds? The Sure 2 Odds VIP package is designed strictly for members who treat their bookings as serious investments. Access our premium dashboard today by clicking 'VIP CODE' and securing your membership.",
        "We are currently celebrating massive consecutive wins within our VIP community. Our experts dedicate hours of deep statistical analysis so you do not have to. Upgrade today and start applying professional strategies to your daily selections.",
        "Information is your most valuable asset, and our VIP codes provide the highest quality insights available. Stop missing out on the premium odds that our VIP members are cashing out on right now. Make the smart choice and elevate your account status today.",
        "Your Basic account restricts you from seeing our highest-performing daily codes. Our VIP service guarantees exclusive access to premium selections with exceptional track records. Click 'VIP CODE' on your main menu to unlock your full potential.",
        "A true winning strategy requires patience, discipline, and the right data. At Sure 2 Odds, our VIP codes supply the critical data you need to stay ahead of the game. Invest in your success today by activating your 30-day VIP subscription.",
        "We value your presence in the Sure 2 Odds community, but we want to see you maximize your results. Our VIP members receive our safest and most profitable odds directly to their devices. It is time to step up and experience premium accuracy.",
        "Why settle for average when premium results are just a click away? The VIP tier provides a completely different level of precision and risk management compared to our free codes. Upgrade securely via Squadco or Manual Transfer today.",
        "Success is rarely accidental; it is the result of following expert guidance. Our VIP analysts have an unparalleled win rate, giving our premium members absolute peace of mind. Join the winning side today and watch your consistency improve.",
        "Every day you wait is another premium code missed. The Sure 2 Odds VIP package is heavily subsidized to ensure maximum value for our serious members. Do not let today's high-odds ticket pass you by; tap 'VIP CODE' to get started.",
        "Basic codes are great, but VIP codes are a lifestyle. Our premium members enjoy the confidence of knowing their selections are vetted by top-tier professionals. Secure your 30-day access now and transform your daily experience.",
        "We have recently upgraded our algorithm and analytical approach for our VIP selections, yielding phenomenal results. If you are reading this, you are missing out on the profits. Make the switch today and start accessing our exclusive daily updates.",
        "It takes a solid foundation to build consistent success. By subscribing to our VIP tier, you align yourself with a platform dedicated entirely to accurate, high-value odds. Tap 'VIP CODE' to process your secure payment and instantly unlock your dashboard.",
        "We understand that trust is earned, which is why our VIP results speak for themselves. Hundreds of members are currently enjoying the peace of mind that comes with our premium selections. Stop guessing and start upgrading today.",
        "Treat your daily selections with the professionalism they deserve. The Sure 2 Odds VIP membership removes the guesswork, providing you with clear, calculated, and highly probable odds. Upgrade your account and start your winning streak today.",
        "You are just one decision away from accessing the most reliable booking codes available. Our VIP platform is tailored for users who demand excellence and consistency. Do not hesitate; click on 'VIP CODE' and choose your preferred payment gateway.",
        "Our backend analytics show that VIP members recover their subscription costs incredibly fast due to the quality of our odds. It is an investment in expert knowledge and data-driven success. Secure your VIP slot today before the next code drops.",
        "We pride ourselves on the transparency and accuracy of our VIP service. Our premium members do not stress over daily selections; they let our experts do the heavy lifting. Upgrade your membership right now and enjoy priority access.",
        "The Sure 2 Odds mission is to provide undeniable value. While we love offering free codes, our VIP section is where the real magic happens. Take control of your daily strategy and activate your premium VIP access immediately."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
};

module.exports = { getDailyPromoMessage };
