const fs = require('fs');
const path = require('path');

function runtime(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > ding(d) : ""; // wait, let's keep standard calculation safely
    
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

function getSriLankaTime() {
    const optionsTime = { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const optionsDate = { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' };
    const optionsDay = { timeZone: 'Asia/Colombo', weekday: 'long' };

    const formatterTime = new Intl.DateTimeFormat([], optionsTime);
    const formatterDate = new Intl.DateTimeFormat('en-GB', optionsDate);
    const formatterDay = new Intl.DateTimeFormat('en-US', optionsDay);

    const now = new Date();
    return {
        time: formatterTime.format(now),
        date: formatterDate.format(now),
        day: formatterDay.format(now)
    };
}

function getRandomCustomMedia(category, type) {
    try {
        const mediaDir = path.join(__dirname, `../media/${category}/${type}`);
        if (!fs.existsSync(mediaDir)) return null;
        
        const files = fs.readdirSync(mediaDir);
        if (files.length === 0) return null;
        
        const randomFile = files[Math.floor(Math.random() * files.length)];
        return path.join(mediaDir, randomFile);
    } catch (e) {
        return null;
    }
}

module.exports = {
    runtime,
    getSriLankaTime,
    getRandomCustomMedia
};
