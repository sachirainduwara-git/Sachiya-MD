const { cmd, commands } = require('../command');
const fg = require('api-dylux'); // බොහෝ බොට්ස් වල සින්දු ඇදීමට පාවිච්චි කරන ස්ථාවර ලයිබ්‍රරියක්
const ytSearch = require('yt-search');

cmd({
    pattern: "song",
    alias: ["audio", "play"],
    desc: "Download YouTube songs safely without errors",
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
        const data = search.videos[0];
        
        if (!data) return reply("❌ No results found for your query!");

        const url = data.url;

        let desc = `*─── ｢ SACHIYA-MD SONG DOWNLOADER ｣ ───*

🎵 *Title:* ${data.title}
⏱ *Duration:* ${data.timestamp}
👀 *Views:* ${data.views}
👤 *Author:* ${data.author.name}
🔗 *URL:* ${url}

> *Downloading your audio, please wait...*`;

        // සින්දුවේ විස්තර සහ තම්බ්නේල් එක යැවීම
        await sachiya.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: desc
        }, { quoted: mek });

        // 2. API හෝ YTDL හරහා ඔඩියෝ බෆර් එක ලබාගැනීම
        // මෙහිදී dylux හෝ වෙනත් ස්ථාවර api එකක් මඟින් ඩවුන්ලෝඩ් ලින්ක් එක ලබා ගනී
        const audioStream = await fg.yta(url);
        
        if (!audioStream || !audioStream.dl_url) {
            return reply("❌ Error: Failed to fetch audio stream from YouTube!");
        }

        // 3. WhatsApp වෙත නිවැරදි Audio File එකක් ලෙස යැවීම
        await sachiya.sendMessage(from, {
            audio: { url: audioStream.dl_url },
            mimetype: 'audio/mpeg',
            fileName: `${data.title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: data.title,
                    body: "SACHIYA-MD MUSIC PLAYER",
                    thumbnailUrl: data.thumbnail,
                    sourceUrl: url,
                    mediaType: 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log("Song Download Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
