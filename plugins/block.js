const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

const BlockSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    blockedChats: { type: Array, default: [] }
});
const BlockModel = mongoose.models.BlockList || mongoose.model('BlockList', BlockSchema);

async function saveBlockedListToMongo(chats) {
    try {
        await BlockModel.findOneAndUpdate(
            { _id: 'sachiyamd_blocks' },
            { blockedChats: chats },
            { upsert: true, new: true }
        );
    } catch (e) {
        console.log("Block Save Error:", e);
    }
}

async function loadBlockedChats() {
    try {
        let doc = await BlockModel.findOne({ _id: 'sachiyamd_blocks' });
        if (doc && doc.blockedChats) {
            global.blockedChatsCache = doc.blockedChats;
        } else {
            global.blockedChatsCache = [];
        }
    } catch (e) {
        global.blockedChatsCache = [];
    }
}
loadBlockedChats();

// 1. BLOCK COMMAND
cmd({
    pattern: "block",
    alias: ["blockchat"],
    desc: "Block bot from responding in this chat or group",
    category: "owner",
    react: "🚫",
    filename: __filename
}, async (sock, mek, m, { reply, senderNumber, from, isGroup }) => {
    try {
        const ownerNumConfig = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
        const currentSenderClean = (senderNumber || m.sender || '').replace(/[^0-9]/g, '');
        const botJidNormalized = sock.user ? sock.user.id.split('@')[0].split(':')[0] : '';
        
        const isActuallyOwner = currentSenderClean.includes(ownerNumConfig) || 
                                ownerNumConfig.includes(currentSenderClean) || 
                                mek.key.fromMe || 
                                currentSenderClean === botJidNormalized;

        if (!isActuallyOwner) {
            return reply('*❌ This command is only for the Owner!*');
        }

        if (!global.blockedChatsCache) global.blockedChatsCache = [];

        if (global.blockedChatsCache.includes(from)) {
            return reply(isGroup ? '⚠️ *මෙම ගෲප් එක දැනටමත් බ්ලොක් කර ඇත!*' : '⚠️ *මෙම චැට් එක දැනටමත් බ්ලොක් කර ඇත!*');
        }

        global.blockedChatsCache.push(from);
        await saveBlockedListToMongo(global.blockedChatsCache);

        if (isGroup) {
            return reply('🚫 *මෙම ගෲප් එකට බොට්ගේ ක්‍රියාකාරිත්වය සම්පූර්ණයෙන්ම අත්හිටුවන ලදී (ගෲප් එක බ්ලොක් කරන ලදී).*');
        } else {
            return reply('🚫 *මෙම චැට් එකට බොට්ගේ ක්‍රියාකාරිත්වය සම්පූර්ණයෙන්ම අත්හිටුවන ලදී (චැට් එක බ්ලොක් කරන ලදී).*');
        }
    } catch (e) {
        console.log("Block Error:", e);
        return reply(`*❌ Error:* ${e.message}`);
    }
});

// 2. UNBLOCK COMMAND
cmd({
    pattern: "unblock",
    alias: ["unblockchat"],
    desc: "Unblock bot in this chat or group",
    category: "owner",
    react: "✅",
    filename: __filename
}, async (sock, mek, m, { reply, senderNumber, from, isGroup }) => {
    try {
        const ownerNumConfig = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
        const currentSenderClean = (senderNumber || m.sender || '').replace(/[^0-9]/g, '');
        const botJidNormalized = sock.user ? sock.user.id.split('@')[0].split(':')[0] : '';
        
        const isActuallyOwner = currentSenderClean.includes(ownerNumConfig) || 
                                ownerNumConfig.includes(currentSenderClean) || 
                                mek.key.fromMe || 
                                currentSenderClean === botJidNormalized;

        if (!isActuallyOwner) {
            return reply('*❌ This command is only for the Owner!*');
        }

        if (!global.blockedChatsCache) global.blockedChatsCache = [];

        if (!global.blockedChatsCache.includes(from)) {
            return reply(isGroup ? '⚠️ *මෙම ගෲප් එක බ්ලොක් කර නැත!*' : '⚠️ *මෙම චැට් එක බ්ලොක් කර නැත!*');
        }

        global.blockedChatsCache = global.blockedChatsCache.filter(item => item !== from);
        await saveBlockedListToMongo(global.blockedChatsCache);

        return reply(isGroup ? '✅ *මෙම ගෲප් එක සාර්ථකව අන්බ්ලොක් කරන ලදී! දැන් බොට් ක්‍රියාත්මක වේ.*' : '✅ *මෙම චැට් එක සාර්ථකව අන්බ්ලොක් කරන ලදී! දැන් බොට් ක්‍රියාත්මක වේ.*');
    } catch (e) {
        console.log("Unblock Error:", e);
        return reply(`*❌ Error:* ${e.message}`);
    }
});

// 3. BLOCKLIST COMMAND (With accurate Group Names & User IDs)
cmd({
    pattern: "blocklist",
    alias: ["blockedchats"],
    desc: "View all blocked chats and groups with names",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (sock, mek, m, { reply, senderNumber, from }) => {
    try {
        const ownerNumConfig = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
        const currentSenderClean = (senderNumber || m.sender || '').replace(/[^0-9]/g, '');
        const botJidNormalized = sock.user ? sock.user.id.split('@')[0].split(':')[0] : '';
        
        const isActuallyOwner = currentSenderClean.includes(ownerNumConfig) || 
                                ownerNumConfig.includes(currentSenderClean) || 
                                mek.key.fromMe || 
                                currentSenderClean === botJidNormalized;

        if (!isActuallyOwner) {
            return reply('*❌ This command is only for the Owner!*');
        }

        if (!global.blockedChatsCache) {
            await loadBlockedChats();
        }

        let blockedList = global.blockedChatsCache || [];

        if (blockedList.length === 0) {
            return reply('📋 *දුම්රිය/චැට් කිසිවක් දැනට බ්ලොක් කර නොමැත (Block List is Empty).*');
        }

        let listText = `╭━━━〔 *🚫 SACHIYA-MD BLOCK LIST* 〕━━━\n` +
                       `┃\n` +
                       `┃ 📊 *Total Blocked:* ${blockedList.length}\n` +
                       `┃\n`;

        for (let i = 0; i < blockedList.length; i++) {
            let chatId = blockedList[i];
            let displayName = "Unknown Chat";
            let typeIcon = "👤";

            if (chatId.includes('@g.us')) {
                typeIcon = "👥";
                try {
                    let groupMeta = await sock.groupMetadata(chatId);
                    displayName = groupMeta && groupMeta.subject ? groupMeta.subject : "Unnamed Group";
                } catch (err) {
                    displayName = "Protected / Left Group";
                }
            } else {
                typeIcon = "👤";
                displayName = chatId.split('@')[0];
            }

            // Clean up name characters to prevent UI breaks
            let cleanName = displayName.replace(/[\*\_\~\[\]\`]/g, '');

            listText += `┃ *[${i + 1}]* ${typeIcon} *${cleanName}*\n` +
                        `┃      ID: \`${chatId}\`\n`;
        }

        listText += `┃\n` +
                    `┃ 📌 *Reply with number [1-${blockedList.length}] to UNBLOCK that chat!*\n` +
                    `┃ *(Valid for 10 Minutes)*\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        let sentMsg = await sock.sendMessage(from, { text: listText }, { quoted: mek });
        const messageID = sentMsg.key.id;

        const unblockListener = async (chatUpdate) => {
            try {
                const mekResp = chatUpdate.messages[0];
                if (!mekResp || !mekResp.message) return;

                const respText = mekResp.message.conversation || mekResp.message.extendedTextMessage?.text || "";
                const senderID = mekResp.key.remoteJid;
                const isReply = mekResp.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (isReply && senderID === from && respText) {
                    let index = parseInt(respText.trim()) - 1;

                    if (isNaN(index) || index < 0 || index >= blockedList.length) {
                        await sock.sendMessage(from, { text: `*❌ Invalid number! Reply with 1 to ${blockedList.length}.*` }, { quoted: mekResp });
                        return;
                    }

                    sock.ev.off("messages.upsert", unblockListener);
                    let targetToUnblock = blockedList[index];

                    global.blockedChatsCache = global.blockedChatsCache.filter(item => item !== targetToUnblock);
                    await saveBlockedListToMongo(global.blockedChatsCache);

                    await sock.sendMessage(from, { 
                        text: `✅ *Successfully Unblocked:* \`${targetToUnblock}\`` 
                    }, { quoted: mekResp });
                    await sock.sendMessage(from, { react: { text: "✅", key: mekResp.key } });
                }
            } catch (err) {
                console.log("Blocklist Unblock Listener Error:", err);
            }
        };

        sock.ev.on("messages.upsert", unblockListener);
        setTimeout(() => sock.ev.off("messages.upsert", unblockListener), 10 * 60 * 1000);

    } catch (e) {
        console.log("Blocklist Error:", e);
        return reply(`*❌ Error:* ${e.message}`);
    }
});
