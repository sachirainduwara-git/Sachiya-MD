const { cmd } = require('../command');
const axios = require('axios');

// සර්ච් කරන මූවීස් තාවකාලිකව මතක තබා ගැනීමට (Session Handler)
global.cineSubzSessions = global.cineSubzSessions || new Map();

const API_KEY = "hashu_3ae2e68412fd1ef2c0b0da3f2959e1d0";

// 1. CineSubz Movie Search Command (.cinesubz හෝ .movie)
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
        if (!q) return reply("❌ Please give a movie name to search!\n*Example:* `.cinesubz Leo`");

        await reply("🔎 *Searching CineSubz database, please wait...*");

        const searchUrl = `https://hashu-apis-production.up.railway.app/api/cinesubz/search?apiKey=${API_KEY}&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data || !data.status || !data.result || data.result.length === 0) {
            return reply("❌ No movies found for your search query on CineSubz!");
        }

        const movies = data.result.slice(0, 10); // පළමු මූවීස් 10 පමණක් පෙන්වයි
        let listText = `╭━━━〔 *🎬 CINESUBZ SEARCH RESULTS* 〕━━━\n` +
                       `┃\n` +
                       `┃ 🔍 *Query:* ${q}\n` +
                       `┃ 📌 *Found:* ${movies.length} Results\n` +
                       `┃\n` +
                       `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        let resultsArray = [];

        movies.forEach((movie, index) => {
            const num = index + 1;
            listText += `┃ *${num}.* ${movie.title}\n` +
                        `┃    🔗 *Link:* ${movie.link}\n`;
            resultsArray.push({
                title: movie.title,
                link: movie.link
            });
        });

        listText += `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> 💡 *Reply to this message with the number (e.g. 1, 2, 3) to download the movie!*`;

        // සෙෂන් එකේ මේ චැට් එකට අදාළ මූවී ලිස්ට් එක සේව් කරගමු (මිනිත්තු 5 කින් Expire වේ)
        const sentMsg = await sachiya.sendMessage(from, {
            image: { url: 'https://raw.githubusercontent.com/sachirainduwara-git/Sachiya-MD/main/media/IMG_0160.png' },
            caption: listText
        }, { quoted: mek });

        if (sentMsg && sentMsg.key) {
            global.cineSubzSessions.set(sentMsg.key.id, {
                movies: resultsArray,
                sender: m.sender
            });

            // විනාඩි 5 කින් මේ සෙෂන් එක ඔටෝ ක්ලියර් වෙන්න දාමු
            setTimeout(() => {
                if (global.cineSubzSessions.has(sentMsg.key.id)) {
                    global.cineSubzSessions.delete(sentMsg.key.id);
                }
            }, 300000);
        }

    } catch (e) {
        console.error("CineSubz Search Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 2. Reply එක මගින් මූවී ඩවුන්ලෝඩ් කිරීම හැසිරවීම (Message Upsert Listener වෙනුවට මෙහිම හෝ Main එකේ හැසිරවිය හැක)
// මෙහිදී බෝට් වෙත එන මැසේජ් එක සර්ච් මීනු එකකට රිප්ளை කර ඇත්දැයි පරීක්ෂා කරයි.
cmd({
    on: "text",
    filename: __filename
},
async (sachiya, mek, m, { from, quoted, body, reply }) => {
    try {
        if (!quoted || !quoted.id) return;
        
        // රිප්ளை කළ මැසේජ් එක අපේ සෙෂන් එකේ තියෙනවද බලමු
        if (global.cineSubzSessions && global.cineSubzSessions.has(quoted.id)) {
            const sessionData = global.cineSubzSessions.get(quoted.id);
            
            // වෙනත් කෙනෙක් රිප්ளை කරනවා නම් වළක්වන්න (ඔප්ෂනල්)
            const choiceNum = parseInt(body.trim());
            if (isNaN(choiceNum)) return;

            const movies = sessionData.movies;
            if (choiceNum < 1 || choiceNum > movies.length) {
                return reply(`❌ Invalid number! Please select a number between 1 and ${movies.length}.`);
            }

            const selectedMovie = movies[choiceNum - 1];
            await reply(`⏳ *Downloading "${selectedMovie.title}"... Please wait!*`);

            // ඩවුන්ලෝඩ් API එකට ලින්ක් එක යැවීම
            const dlApiUrl = `https://hashu-apis-production.up.railway.app/api/cinesubz/dl?apiKey=${API_KEY}&text=${encodeURIComponent(selectedMovie.link)}`;
            const { data } = await axios.get(dlApiUrl);

            if (!data || !data.status || !data.result) {
                return reply("❌ Failed to fetch download links for this movie from CineSubz API.");
            }

            const resData = data.result;
            const movieTitle = resData.title || selectedMovie.title;
            const downloadLinks = resData.dl_links || resData.links || [];

            let dlMsg = `╭━━━〔 *📥 MOVIE DOWNLOAD READY* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎬 *Title:* ${movieTitle}\n` +
                        `┃ 📦 *Quality Options Available Below*\n` +
                        `┃\n`;

            // ඩවුන්ලෝඩ් ලින්ක්ස් ටික පිළිවෙළකට සකස් කිරීම
            if (Array.isArray(downloadLinks) && downloadLinks.length > 0) {
                downloadLinks.forEach((linkObj, idx) => {
                    dlMsg += `┃ *${idx + 1}.* [${linkObj.quality || 'HD'}] - ${linkObj.size || 'N/A'}\n` +
                             `┃    🔗 ${linkObj.link}\n`;
                });
            } else if (typeof resData.download === 'string') {
                dlMsg += `┃ 🔗 *Direct Link:* ${resData.download}\n`;
            } else {
                dlMsg += `┃ ⚠️ Direct links formatting error, check API response.\n`;
            }

            dlMsg += `┃\n` +
                     `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                     `> *⚡ Powered by SACHIYA-MD & CineSubz*`;

            // සෙෂන් එක මකා දමමු
            global.cineSubzSessions.delete(quoted.id);

            await sachiya.sendMessage(from, {
                image: { url: resData.image || 'https://raw.githubusercontent.com/sachirainduwara-git/Sachiya-MD/main/media/IMG_0160.png' },
                caption: dlMsg
            }, { quoted: mek });

            // ලින්ක් එකෙන් වීඩියෝ ෆයිල් එක කෙලින්ම යවන්න පුළුවන් නම් (Direct file link එකක් නම්)
            const directFile = downloadLinks[0]?.link || resData.download;
            if (directFile && typeof directFile === 'string' && directFile.startsWith('http')) {
                try {
                    await sachiya.sendMessage(from, {
                        document: { url: directFile },
                        mimetype: 'video/mp4',
                        fileName: `${movieTitle}.mp4`,
                        caption: `🎬 *${movieTitle}*`
                    }, { quoted: mek });
                } catch (fileErr) {
                    // ෆයිල් එක ලොකු වැඩි නම් හෝ සර්වර් එකෙන් බ්ලොක් නම් ලින්ක්ස් ටික විතරක් යයි
                }
            }
        }
    } catch (e) {
        console.error("CineSubz Download Selection Error:", e);
    }
});
