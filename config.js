const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

module.exports = {
  SESSION_ID: process.env.SESSION_ID || "mongodb+srv://sachirainduwara:<sachi2010>@whatsapp.um8jkiq.mongodb.net/?appName=Whatsapp",
  PREFIX: process.env.PREFIX || ".",
  OWNER_NUM: process.env.OWNER_NUM || "94760579211",
  ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/sachirainduwara-git/Sachiya-MD/blob/main/media/Image.jpg",
  MODE: process.env.MODE || "public"
};
