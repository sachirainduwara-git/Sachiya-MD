const { cmd, commands } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["audio", "play"],
    desc: "Download YouTube songs safely using reliable API",
    category: "download",
    react: "🎵",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("⚠️ Please give me a song name or YouTube link!\n\n*Example:* `.song Kella`");
        
        // සෙවුම් පණිවිඩය ලබා දීම
        await reply("🔍 *Searching for your song...*");

        // 1. YouTube Search කිරීම
        const search = await ytSearch(q);
        if (!search.videos || !search.videos.length) {
            return reply("❌ No results found for your query!");
        }

        const video = search.videos[0];
        const videoUrl = video.url;

        let desc = `*─── ｢ SACHIYA-MD SONG DOWNLOADER ｣ ───*

🎵 *Title:* ${video.title}
⏱ *Duration:* ${video.timestamp}
👀 *Views:* ${video.views}
👤 *Author:* ${video.author.name}
🔗 *URL:* ${videoUrl}

> *Downloading your audio, please wait...*`;

        // සින්දුවේ විස්තර සහ තම්බ්නේල් එක යැවීම
        await sachiya.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: desc
        }, { quoted: mek });

        // 2. ස්ක්‍රීන්ෂොට් එකේ ඇති නිවැරදි API එක හරහා ඔඩියෝ ලින්ක් එක ලබාගැනීම
        const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${videoUrl}`;
        const res = await axios.get(apiUrl, { timeout: 60000 });

        if (!res.data || !res.data.status || !res.data.result || !res.data.result.download_url) {
            return reply("❌ Failed to generate audio download link. Please try again later.");
        }

        const dlUrl = res.data.result.download_url;
        const title = res.data.result.title || video.title;

        // 3. WhatsApp වෙත නිවැරදි Audio File එකක් ලෙස යැවීම
        await sachiya.sendMessage(from, {
            audio: { url: dlUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "SACHIYA-MD MUSIC PLAYER",
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: videoUrl,
                    mediaType: 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log("Song Download Error:", e);
        reply(`❌ Error: ${e.message || e}`);
    }
});
