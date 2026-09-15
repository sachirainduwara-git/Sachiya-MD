const { cmd } = require("../command");
const axios = require("axios");

const API_KEY = "hashu_a70f3f6beed64bebddc7c36026f813f5";
const SEARCH_API = "https://hashu-apis-production.up.railway.app/api/song/search";
const DOWNLOAD_API = "https://hashu-apis-production.up.railway.app/api/ytdl";

cmd({
    pattern: "song",
    react: "🎵",
    desc: "Search and Download Songs with Reply Options",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ *PLEASE PROVIDE A SONG TITLE OR YOUTUBE LINK!*\n\n*Example:* `.song Ma diha`");

        reply("🔍 *SEARCHING FOR YOUR SONG...* 🎶");

        // 1. Search Request
        const searchRes = await axios.get(`${SEARCH_API}?apiKey=${API_KEY}&text=${encodeURIComponent(q)}`);
        const searchData = searchRes.data;

        if (!searchData || !searchData.success || !searchData.results || searchData.results.length === 0) {
            return reply("❌ *SONG NOT FOUND! PLEASE TRY ANOTHER QUERY.*");
        }

        const video = searchData.results[0];
        const videoUrl = video.url;
        const title = video.title || "Song";
        const duration = video.duration || "N/A";
        const views = video.views ? video.views.toLocaleString() : "N/A";
        const author = video.author || "N/A";
        const thumbnail = video.thumbnail;

        const descMsg = `╭━━━〔 *SACHIYA-MD MUSIC PLAYER* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📌 *TITLE:* ${title}\n` +
                        `┃ 👤 *ARTIST/CHANNEL:* ${author}\n` +
                        `┃ ⏱️ *DURATION:* ${duration}\n` +
                        `┃ 👁️ *VIEWS:* ${views}\n` +
                        `┃ 🔗 *LINK:* ${videoUrl}\n` +
                        `┃\n` +
                        `┣━━━〔 📥 *SELECT AN OPTION* 〕━━━\n` +
                        `┃\n` +
                        `┃ ☘︎ *1* ┃ 🎧 *AUDIO FILE (VOICE NOTE)*\n` +
                        `┃ ☘︎ *2* ┃ 📁 *DOCUMENT FILE*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> 📌 *REPLY TO THIS MESSAGE WITH 1 OR 2*\n` +
                        `> ✦ *POWERED BY SACHIYA MD* ✨`;

        // Send Details Message
        let sentMsg;
        if (thumbnail) {
            sentMsg = await conn.sendMessage(from, { image: { url: thumbnail }, caption: descMsg }, { quoted: mek });
        } else {
            sentMsg = await conn.sendMessage(from, { text: descMsg }, { quoted: mek });
        }

        const messageID = sentMsg.key.id;

        // 2. Interactive Reply Listener
        const listener = async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const replyId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;

            // Check if user replied to this exact message
            if (replyId !== messageID) return;

            const userChoice = (text || "").trim();

            if (userChoice === "1" || userChoice === "2") {
                // Remove listener to prevent duplicate processing
                conn.ev.off("messages.upsert", listener);

                await conn.sendMessage(from, { react: { text: "📥", key: msg.key } });
                await conn.sendMessage(from, { text: "⏳ *DOWNLOADING AUDIO... PLEASE WAIT!* 🔄" }, { quoted: msg });

                try {
                    // Fetch Download URL
                    const dlRes = await axios.get(`${DOWNLOAD_API}?apiKey=${API_KEY}&text=${encodeURIComponent(videoUrl)}&type=mp3`);
                    const dlData = dlRes.data;
                    const audioLink = dlData?.results?.direct_link || dlData?.results?.dl_link;

                    if (!audioLink) {
                        return conn.sendMessage(from, { text: "❌ *FAILED TO RETRIEVE DOWNLOAD LINK!*" }, { quoted: msg });
                    }

                    // Download Audio Buffer with Bypass Headers
                    const audioResponse = await axios({
                        method: 'GET',
                        url: audioLink,
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                            'Referer': 'https://youtube-mp36.p.rapidapi.com/',
                            'Origin': 'https://youtube-mp36.p.rapidapi.com',
                            'Accept': '*/*'
                        },
                        maxRedirects: 5
                    });

                    const buffer = Buffer.from(audioResponse.data);

                    // Send requested format
                    if (userChoice === "1") {
                        await conn.sendMessage(from, {
                            audio: buffer,
                            mimetype: "audio/mpeg",
                            fileName: `${title}.mp3`
                        }, { quoted: msg });
                    } else if (userChoice === "2") {
                        await conn.sendMessage(from, {
                            document: buffer,
                            mimetype: "audio/mpeg",
                            fileName: `${title}.mp3`,
                            caption: `🎵 *${title}*`
                        }, { quoted: msg });
                    }

                    await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

                } catch (dlErr) {
                    console.error("Download Step Error:", dlErr);
                    await conn.sendMessage(from, { text: "❌ *AN ERROR OCCURRED WHILE DOWNLOADING THE AUDIO!*" }, { quoted: msg });
                }
            }
        };

        conn.ev.on("messages.upsert", listener);

    } catch (e) {
        console.error("====== SONG COMMAND ERROR ======");
        console.error(e);
        reply(`❌ *AN UNEXPECTED ERROR OCCURRED!*\n\n\`\`\`${e.message || "Unknown Error"}\`\`\``);
    }
});
