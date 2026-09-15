const { cmd, commands } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["audio", "play"],
    desc: "Download YouTube songs using Hashu Paid API",
    category: "download",
    react: "🎵",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("⚠️ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Kella`");
        
        await reply("🔍 *Searching for your song... Please wait* 🎶");

        const search = await ytSearch(q);
        if (!search.videos || !search.videos.length) {
            return reply("❌ *No results found for your query!*");
        }

        const video = search.videos[0];
        const videoUrl = video.url;
        const encodedUrl = encodeURIComponent(videoUrl);

        const apiKey = "hashu_33b70902c0489263d4eb64fe4e49dad5";
        const apiUrl = `https://hashu-apis-production.up.railway.app/api/ytdl?apiKey=${apiKey}&text=${encodedUrl}&type=mp3`;

        // 302 Redirect එරර් එක මඟහරවා ගැනීමට maxRedirects එක්ක axios කෝල් එක
        const res = await axios.get(apiUrl, { 
            timeout: 60000,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // 302 සහ අනෙකුත් redirects හැdle කරගැනීමට
            }
        });

        const apiData = res.data;
        if (!apiData) {
            return reply("❌ *Failed to fetch response from download server!*");
        }

        const dlUrl = apiData.download || apiData.dl_url || apiData.result?.download || apiData.result?.dl_url || apiData.url;
        const title = apiData.title || apiData.result?.title || video.title;
        const thumbnail = apiData.thumbnail || apiData.result?.thumbnail || video.thumbnail;

        if (!dlUrl) {
            return reply("❌ *Could not generate audio download link from API!*");
        }

        let desc = `╭━━━〔 *SACHIYA-MD MUSIC PLAYER* 〕━━━\n` +
                   `┃\n` +
                   `┃ 📌 *Title:* ${title}\n` +
                   `┃ ⏱️ *Duration:* ${video.timestamp}\n` +
                   `┃ 👀 *Views:* ${video.views}\n` +
                   `┃ 👤 *Author:* ${video.author.name}\n` +
                   `┃ 📥 *Status:* Downloading audio... 🔄\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA MD 💫*`;

        await sachiya.sendMessage(from, {
            image: { url: thumbnail },
            caption: desc
        }, { quoted: mek });

        await sachiya.sendMessage(from, {
            audio: { url: dlUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "SACHIYA-MD MUSIC PLAYER",
                    thumbnailUrl: thumbnail,
                    sourceUrl: videoUrl,
                    mediaType: 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log("Song Download Error:", e);
        reply(`❌ *An error occurred:* ${e.message || e}`);
    }
});
