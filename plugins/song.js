const { cmd, commands } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["audio", "play"],
    desc: "Download YouTube songs safely using multiple paid & free APIs with fallback",
    category: "download",
    react: "🎵",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("⚠️ Please give me a song name or YouTube link!\n\n*Example:* `.song Kella`");
        
        await reply("🔍 *Searching for your song...*");

        const search = await ytSearch(q);
        if (!search.videos || !search.videos.length) {
            return reply("❌ No results found for your query!");
        }

        const video = search.videos[0];
        const videoUrl = video.url;
        const encodedUrl = encodeURIComponent(videoUrl);

        let desc = `*─── ｢ SACHIYA-MD SONG DOWNLOADER ｣ ───*

🎵 *Title:* ${video.title}
⏱ *Duration:* ${video.timestamp}
👀 *Views:* ${video.views}
👤 *Author:* ${video.author.name}
🔗 *URL:* ${videoUrl}

> *Downloading your audio, please wait...*`;

        await sachiya.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: desc
        }, { quoted: mek });

        let dlUrl = '';
        let title = video.title;

        // 1. Gifted Tech Paid API
        if (!dlUrl) {
            try {
                const res = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp3?apikey=gifted&url=${encodedUrl}`, { timeout: 30000 });
                if (res.data && (res.data.success || res.data.status) && (res.data.result?.dl_url || res.data.result?.download_url || res.data.result)) {
                    dlUrl = res.data.result.dl_url || res.data.result.download_url || res.data.result;
                    if (res.data.result.title) title = res.data.result.title;
                }
            } catch (err) {}
        }

        // 2. David Cyril Tech API
        if (!dlUrl) {
            try {
                const res = await axios.get(`https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodedUrl}`, { timeout: 30000 });
                if (res.data && res.data.status && res.data.result?.download_url) {
                    dlUrl = res.data.result.download_url;
                    if (res.data.result.title) title = res.data.result.title;
                }
            } catch (err) {}
        }

        // 3. Darks MD API
        if (!dlUrl) {
            try {
                const res = await axios.get(`https://api.darks-md.site/api/download/ytmp3?url=${encodedUrl}`, { timeout: 30000 });
                if (res.data && res.data.status && (res.data.result?.download || res.data.result?.dl_url)) {
                    dlUrl = res.data.result.download || res.data.result.dl_url;
                    if (res.data.result.title) title = res.data.result.title;
                }
            } catch (err) {}
        }

        // 4. Cobalt Tools API (Fallback)
        if (!dlUrl) {
            try {
                const res = await axios.post('https://api.cobalt.tools/api/json', {
                    url: videoUrl,
                    isAudioOnly: true,
                    aFormat: 'mp3'
                }, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    timeout: 30000
                });
                if (res.data && (res.data.url || res.data.audio)) {
                    dlUrl = res.data.url || res.data.audio;
                }
            } catch (err) {}
        }

        if (!dlUrl) {
            return reply("❌ All download servers failed to generate an audio stream. Please try a different song or try again later!");
        }

        // WhatsApp වල සියලුම උපාංගවල (iPhone/Android) නිවැරදිව ප්ලේ වීමට audio/mpeg සහ audio/mp4 ලෙස යැවීම
        await sachiya.sendMessage(from, {
            audio: { url: dlUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false,
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
