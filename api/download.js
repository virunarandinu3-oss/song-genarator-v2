const axios = require('axios');
const fs = require('fs');
const path = require('path');

let NodeID3;
try {
  NodeID3 = require('node-id3');
} catch (e) {
  NodeID3 = null;
}

// Pure Audio Frames වෙන් කරගැනීම
function getPureAudioBuffer(buf) {
  let offset = 0;
  if (buf.slice(0, 3).toString() === 'ID3') {
    const tagSize = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
    offset = tagSize + 10;
  }
  for (let i = offset; i < buf.length - 1; i++) {
    if (buf[i] === 0xFF && (buf[i + 1] & 0xE0) === 0xE0) {
      return buf.slice(i);
    }
  }
  return buf.slice(offset);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { audio_url, song_title = 'Viru Beatz Track' } = req.query;

  if (!audio_url) {
    return res.status(400).send('audio_url parameter is required');
  }

  try {
    // 1. Remusic සින්දුව බාගත කිරීම
    const audioRes = await axios.get(audio_url, {
      responseType: 'arraybuffer',
      timeout: 45000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const songRaw = Buffer.from(audioRes.data);
    let finalAudioBuffer = songRaw;

    // 2. ඔබ Upload කළ public/intro.mp3 ගොනුව මුලටම එකතු කිරීම
    const introPath = path.join(process.cwd(), 'public', 'intro.mp3');
    if (fs.existsSync(introPath)) {
      const introRaw = fs.readFileSync(introPath);
      const pureIntro = getPureAudioBuffer(introRaw);
      const pureSong = getPureAudioBuffer(songRaw);

      // Binary Concat (Zero-Latency Merge)
      finalAudioBuffer = Buffer.concat([pureIntro, pureSong]);
    }

    // 3. ID3 Metadata Tags ලිවීම
    if (NodeID3) {
      try {
        const tags = {
          title: song_title,
          artist: "VIRU Beatz",
          composer: "Viruna Randinu",
          performerInfo: "VIRU Beatz",
          album: "VIRU Beatz Studio",
          year: "2026",
          copyright: "Copyright 2026 Viruna Randinu. All Rights Reserved.",
          comment: {
            language: "eng",
            text: "Powered by VIRU Beatz - Produced by Viruna Randinu"
          }
        };

        const taggedBuffer = NodeID3.write(tags, finalAudioBuffer);
        if (taggedBuffer && Buffer.isBuffer(taggedBuffer)) {
          finalAudioBuffer = taggedBuffer;
        }
      } catch (tagErr) {}
    }

    // 4. සින්දුව Download කරදීම
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(song_title)}.mp3"`);
    res.setHeader('Content-Length', finalAudioBuffer.length);
    return res.send(finalAudioBuffer);

  } catch (error) {
    return res.redirect(302, audio_url);
  }
};
