const { cmd, commands } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');
const os = require('os');
const fs = require('fs');
const path = require('path');

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

        // 1. Local Media Folder එකෙන් Audio එක Read කර PTT එකක් ලෙස යැවීම
        const audioPath = path.join(__dirname, '../media/Bailalentho.mp3');
        if (fs.existsSync(audioPath)) {
            await sachiya.sendMessage(from, {
                audio: fs.readFileSync(audioPath),
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: mek }).catch(() => {});
        }

        // 2. Local Image එක හෝ Link එක සමඟ Alive Message එක යැවීම
        const imagePath = path.join(__dirname, '../media/IMG_0160.png');
        if (fs.existsSync(imagePath)) {
            await sachiya.sendMessage(from, {
                image: fs.readFileSync(imagePath),
                caption: aliveMsg
            }, { quoted: mek });
        } else {
            await sachiya.sendMessage(from, {
                image: { url: 'https://github.com/sachirainduwara-git/Sachiya-MD/blob/main/media/IMG_0160.png?raw=true' },
                caption: aliveMsg
            }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
