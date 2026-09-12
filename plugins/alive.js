const { cmd } = require('../command');
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

        // ── 1. Local Audio (Voice Note) යැවීම (ලින්ක් නැත, සම්පූර්ණයෙන්ම ලෝකල් ෆයිල් එකකින්) ──
        const audioPath = path.join(__dirname, '../media/Bailalentho.mp3');
        if (fs.existsSync(audioPath)) {
            const ext = audioPath.split('.').pop().toLowerCase();
            const audioMime = ext === 'mp3' ? 'audio/mpeg' : 'audio/ogg; codecs=opus';
            
            await sachiya.sendMessage(from, {
                audio: fs.readFileSync(audioPath),
                mimetype: audioMime,
                ptt: true
            }, { quoted: mek }).catch(() => {});
        }

        // ── 2. Local Image එක සමඟ Alive Message එක යැවීම ──
        const imagePath = path.join(__dirname, '../media/IMG_0160.png');
        if (fs.existsSync(imagePath)) {
            await sachiya.sendMessage(from, {
                image: fs.readFileSync(imagePath),
                caption: aliveMsg
            }, { quoted: mek });
        } else {
            // ෆයිල් එක නැත්නම් විකල්පව ටෙක්ස්ට් එක යවන්න
            await sachiya.sendMessage(from, { text: aliveMsg }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
