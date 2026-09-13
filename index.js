const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');

const config = require('./config');
const { sms } = require('./lib/msg');
const { commands } = require('./command');

const { storeMessage, handleMessageRevocation } = require('./plugins/antidelete');
const { handleAutoread } = require('./plugins/autoread');
const { handleAutoReact } = require('./plugins/autoreact');
const { handleAutoStatus } = require('./plugins/autostatus');

global.activeSettingsMenus = global.activeSettingsMenus || new Map();

const app = express();
const port = process.env.PORT || 8000;
const server = http.createServer(app);

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94760579211'];

global.blockedChatsCache = [];
global.hasSentBootMessage = false; 
global.hasLoggedConsoleOnce = false; 

const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: Object, required: true }
});
const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

const BlockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  blockedChats: { type: Array, default: [] }
});
const BlockModel = mongoose.models.BlockList || mongoose.model('BlockList', BlockSchema);

const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

async function loadAllSessionsFromMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return [];
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }
    const sessionDocs = await SessionModel.find({});
    return sessionDocs;
  } catch (e) {
    console.error("❌ MongoDB All Sessions Load Error:", e.message);
    return [];
  }
}

async function saveSessionToMongo(authFolder, sessionId) {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    const credsPath = path.join(authFolder, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    const rawData = fs.readFileSync(credsPath, 'utf8');
    if (!rawData || rawData.trim() === '') return;
    const credsData = JSON.parse(rawData);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }

    await SessionModel.findOneAndUpdate(
      { _id: sessionId },
      { data: credsData },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("❌ MongoDB Session Save Error:", e.message);
  }
}

async function clearMongoSession(sessionId) {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }
    await SessionModel.deleteOne({ _id: sessionId });
    console.log(`🗑️ MongoDB session (${sessionId}) cleared due to logout.`);
  } catch (e) {
    console.error("❌ MongoDB Session Clear Error:", e.message);
  }
}

async function loadBlockedListIntoCache() {
  try {
    if (mongoose.connection.readyState === 0 && config.SESSION_ID) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }
    const doc = await BlockModel.findOne({ _id: 'sachiyamd_blocks' });
    if (doc && doc.blockedChats) {
      global.blockedChatsCache = doc.blockedChats;
    } else {
      global.blockedChatsCache = [];
    }
  } catch (e) {
    global.blockedChatsCache = [];
  }
}

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

function loadPlugins() {
  let pluginsPath = path.join(__dirname, "plugins");
  if (!fs.existsSync(pluginsPath)) {
    pluginsPath = path.join(__dirname, "Plugins");
  }

  if (fs.existsSync(pluginsPath)) {
    fs.readdirSync(pluginsPath).forEach((plugin) => {
      if (path.extname(plugin).toLowerCase() === ".js") {
        try {
          require(path.join(pluginsPath, plugin));
        } catch (e) {
          console.error(`❌ Error loading plugin ${plugin}:`, e.message);
        }
      }
    });
    console.log(`✅ Loaded ${commands.length} Commands Successfully!`);
  } else {
    console.error("❌ Plugins folder not found!");
  }
}

async function startSingleSession(sessionDoc) {
  const sessionId = sessionDoc._id;
  const authFolder = path.join(__dirname, `/auth_info_${sessionId}/`);

  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  if (sessionDoc.data) {
    fs.writeFileSync(path.join(authFolder, 'creds.json'), JSON.stringify(sessionDoc.data, null, 2));
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const logger = P({ level: 'info' }); // Enabled info level to track socket state changes clearly

  const messageInMemoryStore = new Map();

  const sachiya = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "120.0.6099.109"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    syncFullHistory: false,
    fireInitQueries: true, 
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      const msgId = key.id;
      if (messageInMemoryStore.has(msgId)) {
        return messageInMemoryStore.get(msgId);
      }
      return undefined;
    }
  });

  let isConnectedOnce = false;

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      isConnectedOnce = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`⚠️ Connection closed for session ${sessionId} with status code: ${statusCode}`);
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.error(`❌ Session (${sessionId}) logged out from WhatsApp! Clearing from MongoDB...`);
        await clearMongoSession(sessionId);
        if (fs.existsSync(authFolder)) {
          fs.rmSync(authFolder, { recursive: true, force: true });
        }
      } else {
        setTimeout(() => startSingleSession(sessionDoc), 5000);
      }
    } else if (connection === 'open') {
      if (isConnectedOnce) return;
      isConnectedOnce = true;

      console.log(`🚀 Session Successfully Connected & Active: ${sessionId}`);

      await saveSessionToMongo(authFolder, sessionId);
      await loadBlockedListIntoCache();
    }
  });

  sachiya.ev.on('creds.update', async () => {
    await saveCreds();
    await saveSessionToMongo(authFolder, sessionId);
  });

  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      if (!chatUpdate.messages || chatUpdate.messages.length === 0) return;
      const mek = chatUpdate.messages[0];
      if (!mek || !mek.message) return;
      
      if (mek.key && mek.key.id && mek.message) {
        messageInMemoryStore.set(mek.key.id, mek.message);
        if (messageInMemoryStore.size > 1000) {
          const firstKey = messageInMemoryStore.keys().next().value;
          messageInMemoryStore.delete(firstKey);
        }
      }

      const from = mek.key.remoteJid;
      let msgType = getContentType(mek.message);
      if (msgType === 'ephemeralMessage') {
        mek.message = mek.message.ephemeralMessage.message;
        msgType = getContentType(mek.message);
      } else if (msgType === 'viewOnceMessage') {
        mek.message = mek.message.viewOnceMessage.message;
        msgType = getContentType(mek.message);
      }

      const rawBody = (msgType === 'conversation') ? mek.message.conversation :
                      (msgType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
                      (msgType === 'imageMessage') ? mek.message.imageMessage.caption :
                      (msgType === 'videoMessage') ? mek.message.videoMessage.caption :
                      mek.text || '';
      
      const bodyText = rawBody ? String(rawBody) : '';

      const m = sms(sachiya, mek);
      const quoted = m.quoted ? m.quoted : null;
      
      const body = bodyText || m.body || '';
      const isCmd = body.startsWith(prefix);
      if (!isCmd) return;

      const commandName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(' ');

      const workMode = config.MODE ? config.MODE.toLowerCase() : "public";
      const rawBotJid = sachiya.user ? sachiya.user.id : '';
      const botJid = jidNormalizedUser(rawBotJid);
      const botNumber = botJid ? botJid.split('@')[0] : '';
      
      const isGroup = from.endsWith('@g.us');
      const rawSender = isGroup ? (mek.key.participant || mek.participant) : from;
      const sender = jidNormalizedUser(rawSender || from);
      const senderNumber = sender ? sender.split('@')[0] : '';

      const isMe = botNumber && senderNumber ? botNumber.includes(senderNumber) : (mek.key.fromMe || false);
      const isOwner = ownerNumber.includes(senderNumber) || isMe;

      if (workMode === "private" && !isOwner) return;

      const reply = (text) => sachiya.sendMessage(from, { text }, { quoted: mek });

      const cmd = commands.find((c) => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
      if (cmd) {
        try {
          await cmd.function(sachiya, mek, m, {
            from, quoted, body, isCmd, command: commandName, args, q, reply, isGroup, sender, senderNumber, isOwner
          });
        } catch (e) {
          console.error("[PLUGIN ERROR]", e);
        }
      }
    } catch (err) {
      console.error("❌ Message Upsert Error:", err.message);
    }
  });
}

async function connectToWA() {
  console.log("\n⏳ Fetching Sessions from MongoDB Atlas...");
  await loadBlockedListIntoCache();
  const allSessions = await loadAllSessionsFromMongo();

  if (allSessions.length === 0) {
    console.log("❌ No sessions found in MongoDB Atlas! Please link at least one device.");
    return;
  }

  console.log(`📦 Found ${allSessions.length} session(s) in MongoDB. Initializing sockets...`);

  for (const sessionDoc of allSessions) {
    startSingleSession(sessionDoc).catch(err => {
      console.error(`❌ Error starting session ${sessionDoc._id}:`, err.message);
    });
  }
}

loadPlugins();
connectToWA();

app.get("/", (req, res) => {
  res.send("SACHIYA MD Multi-Session Server is running successfully! ✅");
});

server.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
