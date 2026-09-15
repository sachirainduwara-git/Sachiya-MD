/**
 * ----------------------------------------------------------------------------
 * Project Name : SACHIYA-MD
 * Plugin       : Advanced Video Downloader (Dedicated Video APIs)
 * Author       : SACHIYA-MD Dev Team
 * Description  : YouTube Video Downloader using official Video Info & File APIs
 * ----------------------------------------------------------------------------
 */

const { cmd } = require("../command");
const axios = require("axios");

// අලුතෙන් දීපු API Key එක සහ නිවැරදි Endpoint දෙක
const API_KEY = "hashu_3ae2e68412fd1ef2c0b0da3f2959e1d0";
const VIDEO_INFO_API = "https://hashu-apis-production.up.railway.app/api/video/info";
const VIDEO_FILE_API = "https://hashu-apis-production.up.railway.app/api/video/file";

// ─── HELPER FUNCTIONS & ADVANCED LOGIC HANDLERS ─── //

function formatViews(views) {
    if (!views) return "N/A";
    return typeof views === 'number' ? views.toLocaleString() : views;
}

async function fetchVideoInfo(query) {
    try {
        const response = await axios.get(`${VIDEO_INFO_API}?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`, {
            timeout: 30000
        });
        return response.data;
    } catch (err) {
        console.error("Video Info API Error:", err.message);
        return null;
    }
}

async function fetchVideoFileLink(videoUrl) {
    try {
        const response = await axios.get(`${VIDEO_FILE_API}?apiKey=${API_KEY}&url=${encodeURIComponent(videoUrl)}`, {
            timeout: 60000
        });
        return response.data;
    } catch (err) {
        console.error("Video File API Error:", err.message);
        return null;
    }
}

// ─── MAIN COMMAND EXECUTION ─── //

cmd({
    pattern: "video",
    alias: ["vid", "mp4", "movie"],
    react: "🎥",
    desc: "Search and Download YouTube Videos using dedicated APIs without freezing",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        // Validation check for empty query
        if (!q) {
            return reply(
                "⚠️ *PLEASE PROVIDE A VIDEO TITLE OR YOUTUBE LINK!*\n\n" +
                "*Example:* `.video Kella`\n" +
                "*Example:* `.video https://youtube.com/watch?v=xxxx`"
            );
        }

        // Initial response status notification
        await reply("🔍 *SEARCHING FOR YOUR VIDEO... PLEASE WAIT* 🎬");

        // 1. Fetch Video Metadata using Info API
        const infoData = await fetchVideoInfo(q);

        if (!infoData || (!infoData.success && !infoData.results && !infoData.url)) {
            return reply("❌ *VIDEO NOT FOUND! PLEASE TRY ANOTHER QUERY OR CHECK THE LINK.*");
        }

        // Handle various possible JSON response structures safely
        const videoInfo = infoData.results || infoData;
        const videoUrl = videoInfo.url || videoInfo.link || q;
        const title = videoInfo.title || "YouTube Video";
        const duration = videoInfo.duration || videoInfo.timestamp || "N/A";
        const views = formatViews(videoInfo.views);
        const author = videoInfo.author || videoInfo.channel || "N/A";
        const thumbnail = videoInfo.thumbnail || videoInfo.image || "";

        // ─── UI DESIGN & CAPTION FORMATTING (Border Style) ─── //
        const descMsg = `╭━━━〔 *SACHIYA-MD VIDEO MANAGER* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📌 *TITLE:* ${title}\n` +
                        `┃ 👤 *ARTIST/CHANNEL:* ${author}\n` +
                        `┃ ⏱️ *DURATION:* ${duration}\n` +
                        `┃ 👁️ *VIEWS:* ${views}\n` +
                        `┃ 🔗 *LINK:* ${videoUrl}\n` +
                        `┃\n` +
                        `┣━━━〔 📥 *SELECT VIDEO FORMAT* 〕━━━\n` +
                        `┃\n` +
                        `┃ ☘︎ *1* ┃ 🎬 *VIDEO FILE (NORMAL MP4)*\n` +
                        `┃ ☘︎ *2* ┃ 📁 *DOCUMENT FILE (HD QUALITY)*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> 📌 *REPLY TO THIS MESSAGE WITH 1 OR 2*\n` +
                        `> ✦ *POWERED BY SACHIYA MD* ✨`;

        // Send Details Message with Thumbnail Preview
        let sentMsg;
        if (thumbnail) {
            sentMsg = await conn.sendMessage(from, { 
                image: { url: thumbnail }, 
                caption: descMsg,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: `🎥 SACHIYA-MD VIDEO PLAYER • ${author}`,
                        thumbnailUrl: thumbnail,
                        sourceUrl: videoUrl,
                        mediaType: 2,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });
        } else {
            sentMsg = await conn.sendMessage(from, { text: descMsg }, { quoted: mek });
        }

        const messageID = sentMsg.key.id;

        // ─── INTERACTIVE REPLY LISTENER LOGIC ─── //
        const listener = async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg.message) return;

                const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                const replyId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;

                // Ensure user is replying specifically to this prompt message
                if (replyId !== messageID) return;

                const userChoice = (text || "").trim();

                if (userChoice === "1" || userChoice === "2") {
                    // Remove listener immediately to prevent duplicate triggers
                    conn.ev.off("messages.upsert", listener);

                    // Reaction and progress notification
                    await conn.sendMessage(from, { react: { text: "📥", key: msg.key } });
                    await conn.sendMessage(from, { text: "⏳ *DOWNLOADING VIDEO STREAM... PLEASE WAIT!* 🔄" }, { quoted: msg });

                    // 2. Fetch Video Direct Download Link using File API
                    const fileData = await fetchVideoFileLink(videoUrl);
                    
                    if (!fileData) {
                        return conn.sendMessage(from, { text: "❌ *CONNECTION FAILED WHILE FETCHING FILE DATA FROM API!*" }, { quoted: msg });
                    }

                    // Extract direct download link safely from various keys
                    const directVideoLink = fileData?.results?.download || fileData?.results?.direct_link || fileData?.results?.dl_link || fileData?.download || fileData?.url;

                    if (!directVideoLink) {
                        return conn.sendMessage(from, { text: "❌ *FAILED TO RETRIEVE VIDEO DIRECT LINK FROM SERVER!*" }, { quoted: msg });
                    }

                    // 3. Download Binary Buffer safely with custom security headers
                    const videoResponse = await axios({
                        method: 'GET',
                        url: directVideoLink,
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                            'Referer': 'https://youtube.com/',
                            'Origin': 'https://youtube.com',
                            'Accept': '*/*'
                        },
                        maxRedirects: 10,
                        timeout: 120000 // 2 minutes timeout for heavy video files
                    });

                    const buffer = Buffer.from(videoResponse.data);

                    if (!buffer || buffer.length === 0) {
                        return conn.sendMessage(from, { text: "❌ *DOWNLOADED VIDEO BUFFER IS EMPTY OR CORRUPTED!*" }, { quoted: msg });
                    }

                    // 4. Send File Based on User Option Selection
                    if (userChoice === "1") {
                        // Send as standard Video message
                        await conn.sendMessage(from, {
                            video: buffer,
                            mimetype: "video/mp4",
                            fileName: `${title}.mp4`,
                            caption: `╭━━━〔 *${title}* 〕━━━\n┃ 🎥 *Status:* Video Sent Successfully!\n╰━━━━━━━━━━━━━━━━━━━`,
                            contextInfo: {
                                externalAdReply: {
                                    title: title,
                                    body: "🎥 SACHIYA-MD VIDEO DOWNLOADER",
                                    thumbnailUrl: thumbnail,
                                    sourceUrl: videoUrl,
                                    mediaType: 2,
                                    renderLargerThumbnail: false
                                }
                            }
                        }, { quoted: msg });

                    } else if (userChoice === "2") {
                        // Send as Document file (Highest stability for large files)
                        await conn.sendMessage(from, {
                            document: buffer,
                            mimetype: "video/mp4",
                            fileName: `${title}.mp4`,
                            caption: `╭━━━〔 *${title}* 〕━━━\n┃ 📁 *Status:* Document Sent Successfully!\n╰━━━━━━━━━━━━━━━━━━━`
                        }, { quoted: msg });
                    }

                    // Success completion reaction
                    await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

                }
            } catch (innerErr) {
                console.error("Video Interactive Stream Error:", innerErr);
                await conn.sendMessage(from, { text: `❌ *AN ERROR OCCURRED DURING PROCESSING:* ${innerErr.message || "Unknown Error"}` }, { quoted: msg });
            }
        };

        // Bind listener to event emitter
        conn.ev.on("messages.upsert", listener);

    } catch (e) {
        console.error("====== VIDEO COMMAND GLOBAL ERROR ======");
        console.error(e);
        reply(`❌ *AN UNEXPECTED SYSTEM ERROR OCCURRED!*\n\n\`\`\`${e.message || "Unknown Error"}\`\`\``);
    }
});
