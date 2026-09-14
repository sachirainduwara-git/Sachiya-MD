const { cmd } = require("../sachintha"); // Bot command handler
const fetch = require("node-fetch");
const yts = require("yt-search");
const axios = require("axios");
const { fakevCard } = require('../lib/fakevCard');

// ==================== SONG / AUDIO DOWNLOADER ====================
cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "mp3", "gana", "music", "audio"],
    react: "🎵",
    desc: "YouTube search & MP3 download",
    category: "download",
    use: ".song <query>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const query = args.join(" ");
        if (!query) return reply("❌ Please provide a song name or YouTube link!");

        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        // 🔍 YouTube Search
        const search = await yts(query);
        if (!search.videos || !search.videos.length) {
            return reply("❌ No results found for your query.");
        }

        const video = search.videos[0];

        // 🎧 Reliable Free Audio API
        const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${video.url}`;
        const res = await axios.get(apiUrl, { timeout: 60000 });

        if (!res.data || !res.data.status || !res.data.result || !res.data.result.download_url) {
            return reply("❌ Failed to generate audio download link. Please try again later.");
        }

        const dlUrl = res.data.result.download_url;
        const title = res.data.result.title || video.title;
        const quality = "128kbps";

        // 🎵 Send Audio File
        await conn.sendMessage(from, {
            audio: { url: dlUrl },
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `${title.replace(/[\\/:*?"<>|]/g, "")}.mp3`,
            caption: 
                `🎵 *SACHINTHA-MD AUDIO PLAYER*\n\n` +
                `📌 *Title:* ${title}\n` +
                `⏱️ *Duration:* ${video.timestamp}\n` +
                `👁️ *Views:* ${video.views}\n` +
                `🎚️ *Quality:* ${quality}\n\n` +
                `> ©️ Powered by Sachintha-MD`,
            contextInfo: {
                externalAdReply: {
                    title: title.substring(0, 40),
                    body: "▶︎ •၊|,|။||||။‌‌‌‌‌၊|• ♫ Sachintha-MD Beats ♫",
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: video.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err);
        reply("❌ An error occurred while processing your request. Please try again later.");
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
    }
});


// ==================== VIDEO DOWNLOADER ====================
cmd({
    pattern: "video",
    alias: ["vid", "ytv", "mp4"],
    desc: "Download YouTube Video",
    category: "download",
    react: "🎬",
    use: ".video <query>",
    filename: __filename
}, 
async (conn, mek, m, { from, args, reply }) => {
    try {
        const query = args.join(" ");
        if (!query) {
            return reply("❌ Please provide a YouTube link or search query.\n\n*Example:* `.video Pasoori`");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        let ytUrl;
        if (query.includes("youtube.com") || query.includes("youtu.be")) {
            ytUrl = query;
        } else {
            let searchResult = await yts(query);
            if (!searchResult || !searchResult.videos || searchResult.videos.length === 0) {
                return reply("❌ No results found on YouTube.");
            }
            ytUrl = searchResult.videos[0].url;
        }

        // 🎥 Reliable Free Video API
        let response = await fetch(`https://apis.davidcyriltech.my.id/youtube/mp4?url=${encodeURIComponent(ytUrl)}`);
        let json = await response.json();

        if (!json.status || !json.result || !json.result.download_url) {
            return reply("❌ Failed to fetch video download link.");
        }

        let downloadUrl = json.result.download_url;
        let videoTitle = json.result.title || "YouTube Video";

        // 📤 Send Video File
        await conn.sendMessage(from, {
            video: { url: downloadUrl },
            mimetype: "video/mp4",
            caption: 
                `🎬 *SACHINTHA-MD VIDEO DOWNLOADER*\n\n` +
                `📌 *Title:* ${videoTitle}\n\n` +
                `> ©️ Powered by Sachintha-MD`,
            contextInfo: {
                externalAdReply: {
                    title: videoTitle.substring(0, 40),
                    body: "🎬 Sachintha-MD HD Video Downloader",
                    thumbnailUrl: json.result.thumbnail || "",
                    sourceUrl: ytUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
        console.error("VIDEO ERROR:", err);
        reply("❌ Error while fetching video.");
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
    }
});
