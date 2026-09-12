const { cmd } = require('../command');
const axios = require('axios');

global.cineSubzSessions = global.cineSubzSessions || new Map();
const API_KEY = "hashu_3ae2e68412fd1ef2c0b0da3f2959e1d0";

// 1. CineSubz Movie Search Command
cmd({
    pattern: "cinesubz",
    alias: ["movie", "cs"],
    desc: "Search and download movies from CineSubz",
    category: "download",
    react: "🎬",
    filename: __filename
},
async (sachiya, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Please give a movie name to search!\n*Example:* `.cinesubz Avengers`");

        await reply("🔎 *Searching CineSubz database, please wait...*");

        // නිවැරදි කළ API Search URL එක
        const searchUrl = `https://hashu-apis-production.up.railway.app/api/cinesubz/search?apiKey=${API_KEY}&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data || !data.result || data.result.length === 0) {
            return reply("❌ No movies found for your search query on CineSubz!");
        }

        const movies = data.result.slice(0, 10);
        let listText = `╭━━━〔 *🎬 CINESUBZ SEARCH RESULTS* 〕━━━\n` +
                       `┃\n` +
                       `┃ 🔍 *Query:* ${q}\n` +
                       `┃ 📌 *Found:* ${movies.length} Results\n` +
                       `┃\n` +
                       `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        let resultsArray = [];

        movies.forEach((movie, index) => {
            const num = index + 1;
            listText += `┃ *${num}.* ${movie.title}\n`;
            resultsArray.push({
                title: movie.title,
                link: movie.link
            });
        });

        listText += `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> 💡 *Reply to this message with the number (e.g. 1, 2, 3) to download the movie!*`;

        const sentMsg = await sachiya.sendMessage(from, {
            image: { url: 'https://raw.githubusercontent.com/sachirainduwara-git/Sachiya-MD/main/media/IMG_0160.png' },
            caption: listText
        }, { quoted: mek });

        if (sentMsg && sentMsg.key) {
            global.cineSubzSessions.set(sentMsg.key.id, {
                movies: resultsArray,
                sender: m.sender
            });

            setTimeout(() => {
                if (global.cineSubzSessions.has(sentMsg.key.id)) {
                    global.cineSubzSessions.delete(sentMsg.key.id);
                }
            }, 300000);
        }

    } catch (e) {
        console.error("CineSubz Search Error:", e.response?.data || e.message);
        reply(`❌ Error: ${e.response?.statusText || e.message}`);
    }
});

// 2. Reply to Download
cmd({
    on: "text",
    filename: __filename
},
async (sachiya, mek, m, { from, quoted, body, reply }) => {
    try {
        if (!quoted || !quoted.id) return;
        
        if (global.cineSubzSessions && global.cineSubzSessions.has(quoted.id)) {
            const sessionData = global.cineSubzSessions.get(quoted.id);
            const choiceNum = parseInt(body.trim());
            if (isNaN(choiceNum)) return;

            const movies = sessionData.movies;
            if (choiceNum < 1 || choiceNum > movies.length) {
                return reply(`❌ Invalid number! Please select a number between 1 and ${movies.length}.`);
            }

            const selectedMovie = movies[choiceNum - 1];
            await reply(`⏳ *Fetching download links for "${selectedMovie.title}"... Please wait!*`);

            // නිවැරදි කළ API Download URL එක
            const dlApiUrl = `https://hashu-apis-production.up.railway.app/api/cinesubz/dl?apiKey=${API_KEY}&text=${encodeURIComponent(selectedMovie.link)}`;
            const { data } = await axios.get(dlApiUrl);

            if (!data || !data.result) {
                return reply("❌ Failed to fetch download links from CineSubz API.");
            }

            const resData = data.result;
            const movieTitle = resData.title || selectedMovie.title;
            const downloadLinks = resData.dl_links || resData.links || [];

            let dlMsg = `╭━━━〔 *📥 MOVIE DOWNLOAD READY* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎬 *Title:* ${movieTitle}\n` +
                        `┃ 📦 *Quality Options:* \n` +
                        `┃\n`;

            if (Array.isArray(downloadLinks) && downloadLinks.length > 0) {
                downloadLinks.forEach((linkObj, idx) => {
                    dlMsg += `┃ *${idx + 1}.* [${linkObj.quality || 'HD'}] - ${linkObj.size || 'N/A'}\n` +
                             `┃    🔗 ${linkObj.link}\n`;
                });
            } else {
                dlMsg += `┃ ⚠️ No direct links found in API response.\n`;
            }

            dlMsg += `┃\n` +
                     `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                     `> *⚡ Powered by SACHIYA-MD & CineSubz*`;

            global.cineSubzSessions.delete(quoted.id);

            await sachiya.sendMessage(from, {
                image: { url: resData.image || 'https://raw.githubusercontent.com/sachirainduwara-git/Sachiya-MD/main/media/IMG_0160.png' },
                caption: dlMsg
            }, { quoted: mek });
        }
    } catch (e) {
        console.error("CineSubz Download Selection Error:", e.response?.data || e.message);
    }
});
