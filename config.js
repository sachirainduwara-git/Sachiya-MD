const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

module.exports = {
  SESSION_ID: process.env.SESSION_ID || "mongodb+srv://prxcaptain_db_user:sachi2010@cluster0.tgn2pgm.mongodb.net/?appName=Cluster0",
  PREFIX: process.env.PREFIX || ".",
  OWNER_NUM: process.env.OWNER_NUM || "94760579211",
  ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/sachirainduwara-git/Sachiya-MD/blob/main/media/IMG_0160.png?raw=true",
  MODE: process.env.MODE || "public"
};
