const { cmd, commands } = require('../command');
const config = require('../config');
const { runtime, toAudio } = require('../lib/functions'); // toAudio මෙතැනට ඉම්පෝට් කරගන්න
const os = require('os');
const axios = require('axios');

cmd({
    pattern: "alive",
    desc: "Check bot status and details",
    category: "main",
    react: "🤖",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, pushname, reply }) => {
    try {
        const userName = pushname || m.pushName || mek.pushName || 'User';

        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedRam = (totalRam - freeRam).toFixed(2);

        let aliveMsg = `*─── ｢ SACHIYA MD ALIVE ｣ ───*

👋 *Hii,* _${userName}_

*🤖 BOT STATUS:*
▸ *Status:* Online ✅
▸ *Uptime:* ${runtime(process.uptime())}
▸ *Prefix:* [ ${config.PREFIX || '.'} ]
▸ *Version:* 1.0.0

*📊 SYSTEM INFO:*
▸ *RAM Usage:* ${usedRam} GB / ${totalRam} GB
▸ *Platform:* ${os.platform()}
▸ *Mode:* Public

*👦 Owner Details:*
▸ *Owner:* Sachira Induwara
▸ *Number:* +94760579211
▸ *Age:* 16+

> 💡 *Type .menu to get all commands!*

*────────────────────────*
*Powered by SACHIYA-MD 💫*`;

        // 1. Audio එක axios හරහා ගෙන FFmpeg හරහා නිවැරදිව Convert කරගැනීම
        let audioBuffer;
        try {
            const response = await axios.get('https://raw.githubusercontent.com/sachirainduwara-git/Sachiya-MD/main/media/Bailalentho.mp3', {
                responseType: 'arraybuffer'
            });
            // Converter එක හරහා ඔඩියෝ ෆෝමැට් එක නිවැරදි කිරීම
            audioBuffer = await toAudio(Buffer.from(response.data), 'mp3');
        } catch (err) {
            console.log("Audio convert error:", err);
        }

        // 2. ප්‍රථමයෙන් ඉමේජ් එක සමඟ කැප්ෂන් එක යැවීම
        await sachiya.sendMessage(from, {
            image: { url: 'https://raw.githubusercontent.com/sachirainduwara-git/Sachiya-MD/main/media/IMG_0160.png' },
            caption: aliveMsg
        }, { quoted: mek });

        // 3. කන්වර්ට් වුණු නිවැරදි Audio Buffer එක යැවීම
        if (audioBuffer) {
            await sachiya.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: 'Sachiya-MD Alive.mp3'
            }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
