const { cmd, commands } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["audio", "play"],
    desc: "Download YouTube songs safely using multi-API fallback",
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

        let dlUrl = '';
        let title = video.title;
        let thumbnail = video.thumbnail;

        // 1. Hashu Paid API
        try {
            const hashuRes = await axios.get(`https://hashu-apis-production.up.railway.app/api/ytdl?apiKey=hashu_33b70902c0489263d4eb64fe4e49dad5&text=${encodedUrl}&type=mp3`, { timeout: 25000 });
            const data = hashuRes.data;
            if (data) {
                dlUrl = data.download || data.dl_url || data.url || data.result?.download || data.result?.dl_url || data.result?.url;
                if (data.title || data.result?.title) title = data.title || data.result?.title;
                if (data.thumbnail || data.result?.thumbnail) thumbnail = data.thumbnail || data.result?.thumbnail;
            }
        } catch (e) {}

        // 2. Gifted Tech API (Fallback 1)
        if (!dlUrl) {
            try {
                const giftedRes = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp3?apikey=gifted&url=${encodedUrl}`, { timeout: 25000 });
                const data = giftedRes.data;
                if (data && data.result) {
                    dlUrl = data.result.dl_url || data.result.download_url || data.result;
                    if (data.result.title) title = data.result.title;
                }
            } catch (e) {}
        }

        // 3. David Cyril Tech API (Fallback 2)
        if (!dlUrl) {
            try {
                const davidRes = await axios.get(`https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodedUrl}`, { timeout: 25000 });
                const data = davidRes.data;
                if (data && data.status && data.result) {
                    dlUrl = data.result.download_url;
                    if (data.result.title) title = data.result.title;
                }
            } catch (e) {}
        }

        // 4. Darks MD API (Fallback 3)
        if (!dlUrl) {
            try {
                const darkRes = await axios.get(`https://api.darks-md.site/api/download/ytmp3?url=${encodedUrl}`, { timeout: 25000 });
                const data = darkRes.data;
                if (data && data.result) {
                    dlUrl = data.result.download || data.result.dl_url;
                    if (data.result.title) title = data.result.title;
                }
            } catch (e) {}
        }

        if (!dlUrl) {
            return reply("❌ *Could not generate audio download link from any servers. Please try again later!*");
        }

        // බොට්ගේ ස්ටයිල් එකටම හැදූ UI Border Caption එක
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
