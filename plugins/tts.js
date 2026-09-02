const { cmd } = require('../command');
const googleTTS = require('google-tts-api');

cmd({
    pattern: "tts",
    alias: ["say", "speech"],
    desc: "Convert text to voice note",
    category: "convert",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර හඬ බවට හැරවිය යුතු වචන කිහිපයක් ලබා දෙන්න!\nඋදා: `.tts sinhala hello` හෝ `.tts ayubowan`");
        
        let lang = "si"; // Default Sinhala
        let text = q;

        if (text.length > 200) {
            return reply("❌ වචන 200 කට වඩා වැඩි ප්‍රමාණයක් එකවර ලබා දිය නොහැක!");
        }

        const url = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
        });

        // Fetch audio buffer directly to prevent WhatsApp download errors
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch audio from Google TTS");
        const buffer = Buffer.from(await response.arrayBuffer());

        await conn.sendMessage(from, {
            audio: buffer,
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply("❌ හඬ පටය සකස් කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
