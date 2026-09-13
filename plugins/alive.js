const { cmd, commands } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');
const os = require('os');

cmd({
    pattern: "alive",
    desc: "Check bot status and details",
    category: "main",
    react: "🤖",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, pushname, reply }) => {
    try {
        // Fix for User Name
        const userName = pushname || m.pushName || mek.pushName || 'User';

        // System Information
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

        // 1. මුලින්ම රවුම් වීඩියෝ එක (Video Note / PTV) හරියටම යැවීම
        await sachiya.sendMessage(from, {
            video: { url: 'https://github.com/sachirainduwara-git/Sachiya-MD/raw/refs/heads/main/media/86bc0efd-5674-4e31-8f95-cc15140fd5ea.mov' },
            mimetype: 'video/mp4',
            ptv: true // WhatsApp එකේ රවුම් වීඩියෝ එකක් (Video Note) ලෙස පෙන්වීමට
        }, { quoted: mek });

        // 2. ඊටපස්සේ Image එක සහ Alive Message එක යැවීම
        await sachiya.sendMessage(from, {
            image: { url: 'https://github.com/sachirainduwara-git/Sachiya-MD/blob/main/media/IMG_0160.png?raw=true' },
            caption: aliveMsg
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
