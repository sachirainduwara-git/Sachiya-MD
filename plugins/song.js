const { cmd } = require("../command");

const API_KEY = "hashu_33b70902c0489263d4eb64fe4e49dad5";
const SEARCH_API = "https://hashu-apis-production.up.railway.app/api/song/search";
const DOWNLOAD_API = "https://hashu-apis-production.up.railway.app/api/ytdl";

cmd(
  {
    pattern: "song",
    alias: ["music", "mp3", "ytsong"],
    react: "🎵",
    desc: "Search and download songs",
    category: "download",
    filename: __filename,
  },

  async (
    sachiya,
    mek,
    m,
    {
      from,
      q,
      reply,
      pushname,
    }
  ) => {
    try {
      // ─────────────────────────────
      // CHECK QUERY
      // ─────────────────────────────
      if (!q) {
        return reply(
          "🎵 *SONG DOWNLOADER*\n\n" +
          "Please enter a song name.\n\n" +
          "*Example:*\n" +
          "`.song Ma Diha`\n\n" +
          "`.song Shape Of You`"
        );
      }

      const userName = pushname || m.pushName || "User";

      await sachiya.sendMessage(from, {
        react: {
          text: "🔎",
          key: mek.key,
        },
      });

      // ─────────────────────────────
      // SEARCH SONG
      // ─────────────────────────────
      const searchURL =
        `${SEARCH_API}?apiKey=${encodeURIComponent(API_KEY)}` +
        `&text=${encodeURIComponent(q)}`;

      const response = await fetch(searchURL);

      if (!response.ok) {
        throw new Error(`Search API Error: ${response.status}`);
      }

      const data = await response.json();

      if (
        !data ||
        !data.success ||
        !Array.isArray(data.results) ||
        data.results.length === 0
      ) {
        await sachiya.sendMessage(from, {
          react: {
            text: "❌",
            key: mek.key,
          },
        });

        return reply(
          `❌ *No songs found for:* ${q}\n\n` +
          `Try another song name.`
        );
      }

      const songs = data.results.slice(0, 10);

      // ─────────────────────────────
      // BUILD SEARCH LIST
      // ─────────────────────────────
      let menu = `╭━━━〔 *🎵 SONG SEARCH* 〕━━━╮\n`;
      menu += `┃\n`;
      menu += `┃ 🔎 *Query:* ${q}\n`;
      menu += `┃ 👤 *Requested by:* ${userName}\n`;
      menu += `┃\n`;
      menu += `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

      menu += `🎧 *SEARCH RESULTS*\n\n`;

      songs.forEach((song, index) => {
        const number = index + 1;

        const title =
          song.title && song.title.trim()
            ? song.title.trim()
            : "Unknown Title";

        const author =
          song.author && song.author.trim()
            ? song.author.trim()
            : "Unknown Artist";

        const duration =
          song.duration && song.duration.trim()
            ? song.duration
            : "Unknown";

        const views =
          typeof song.views === "number"
            ? song.views.toLocaleString()
            : song.views || "Unknown";

        menu += `*${number}.* 🎵 ${title}\n`;
        menu += `   👤 ${author}\n`;
        menu += `   ⏱️ ${duration}  •  👀 ${views}\n\n`;
      });

      menu += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      menu += `📥 *Reply with a number to download*\n`;
      menu += `Example: *1*\n\n`;
      menu += `> *Powered by YOUR-MD ⚡*`;

      // ─────────────────────────────
      // SEND SEARCH RESULT
      // ─────────────────────────────
      const sentMsg = await sachiya.sendMessage(
        from,
        {
          text: menu,
        },
        {
          quoted: mek,
        }
      );

      await sachiya.sendMessage(from, {
        react: {
          text: "🎶",
          key: mek.key,
        },
      });

      // Save search message ID
      const messageID = sentMsg.key.id;

      // ─────────────────────────────
      // REPLY LISTENER
      // ─────────────────────────────
      const handler = async (chatUpdate) => {
        try {
          const responseMsg = chatUpdate.messages?.[0];

          if (!responseMsg || !responseMsg.message) return;

          const remoteJid = responseMsg.key.remoteJid;

          // Only same chat
          if (remoteJid !== from) return;

          const msg =
            responseMsg.message.conversation ||
            responseMsg.message.extendedTextMessage?.text ||
            responseMsg.message.ephemeralMessage?.message
              ?.extendedTextMessage?.text ||
            responseMsg.message.ephemeralMessage?.message
              ?.conversation;

          if (!msg) return;

          const selected = msg.trim();

          // Must be 1-10
          if (!/^(10|[1-9])$/.test(selected)) return;

          // Check reply to OUR search message
          const contextInfo =
            responseMsg.message.extendedTextMessage?.contextInfo ||
            responseMsg.message.ephemeralMessage?.message
              ?.extendedTextMessage?.contextInfo;

          if (!contextInfo) return;

          if (contextInfo.stanzaId !== messageID) return;

          const index = parseInt(selected) - 1;
          const selectedSong = songs[index];

          if (!selectedSong) {
            return sachiya.sendMessage(
              from,
              {
                text: "❌ *Invalid song selection!*",
              },
              {
                quoted: responseMsg,
              }
            );
          }

          // ─────────────────────────
          // REACT
          // ─────────────────────────
          await sachiya.sendMessage(from, {
            react: {
              text: "⏳",
              key: responseMsg.key,
            },
          });

          const title =
            selectedSong.title || "Unknown Song";

          const author =
            selectedSong.author || "Unknown Artist";

          const youtubeURL = selectedSong.url;

          if (!youtubeURL) {
            await sachiya.sendMessage(from, {
              react: {
                text: "❌",
                key: responseMsg.key,
              },
            });

            return sachiya.sendMessage(
              from,
              {
                text: "❌ *This song doesn't have a valid YouTube URL.*",
              },
              {
                quoted: responseMsg,
              }
            );
          }

          // ─────────────────────────
          // DOWNLOAD API
          // ─────────────────────────
          const downloadURL =
            `${DOWNLOAD_API}?apiKey=${encodeURIComponent(API_KEY)}` +
            `&text=${encodeURIComponent(youtubeURL)}` +
            `&type=mp3`;

          const downloadResponse = await fetch(downloadURL);

          if (!downloadResponse.ok) {
            throw new Error(
              `Download API Error: ${downloadResponse.status}`
            );
          }

          const downloadData = await downloadResponse.json();

          if (
            !downloadData ||
            !downloadData.success ||
            !downloadData.results ||
            !downloadData.results.direct_link
          ) {
            await sachiya.sendMessage(from, {
              react: {
                text: "❌",
                key: responseMsg.key,
              },
            });

            return sachiya.sendMessage(
              from,
              {
                text:
                  "❌ *Failed to download this song.*\n\n" +
                  "The download server may be busy or the song may be unavailable.",
              },
              {
                quoted: responseMsg,
              }
            );
          }

          const result = downloadData.results;

          const directLink = result.direct_link;

          const finalTitle =
            result.title || title || "Downloaded Song";

          // ─────────────────────────
          // SEND AUDIO
          // ─────────────────────────
          await sachiya.sendMessage(
            from,
            {
              audio: {
                url: directLink,
              },
              mimetype: "audio/mpeg",
              fileName:
                `${finalTitle}`
                  .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
                  .slice(0, 100) + ".mp3",
              ptt: false,
            },
            {
              quoted: responseMsg,
            }
          );

          await sachiya.sendMessage(from, {
            react: {
              text: "🎧",
              key: responseMsg.key,
            },
          });

          // ─────────────────────────
          // DONE
          // ─────────────────────────
          await sachiya.sendMessage(
            from,
            {
              text:
                `╭━━━〔 *🎧 DOWNLOAD COMPLETE* 〕━━━╮\n` +
                `┃\n` +
                `┃ 🎵 *Title:* ${finalTitle}\n` +
                `┃ 👤 *Artist:* ${author}\n` +
                `┃ 📀 *Format:* MP3\n` +
                `┃ 🎚️ *Quality:* ${result.quality || "128-320kbps"}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                `> *Powered by YOUR-MD ⚡*`,
            },
            {
              quoted: responseMsg,
            }
          );

          // Remove listener after successful download
          sachiya.ev.off("messages.upsert", handler);
        } catch (error) {
          console.error("Song Reply Error:", error);

          await sachiya.sendMessage(from, {
            react: {
              text: "❌",
              key: mek.key,
            },
          }).catch(() => {});
        }
      };

      sachiya.ev.on("messages.upsert", handler);

      // ─────────────────────────────
      // AUTO REMOVE LISTENER
      // after 5 minutes
      // ─────────────────────────────
      setTimeout(() => {
        sachiya.ev.off("messages.upsert", handler);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error("Song Downloader Error:", error);

      await sachiya.sendMessage(from, {
        react: {
          text: "❌",
          key: mek.key,
        },
      }).catch(() => {});

      return reply(
        `❌ *Song Downloader Error*\n\n` +
        `${error.message || "Something went wrong."}`
      );
    }
  }
);
