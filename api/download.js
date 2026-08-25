const axios = require('axios');

let NodeID3;
try {
  NodeID3 = require('node-id3');
} catch (e) {
  NodeID3 = null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { audio_url, song_title = 'Viru Beatz Track' } = req.query;

  if (!audio_url) {
    return res.status(400).send('audio_url parameter is required');
  }

  try {
    // 1. Audio Buffer එක බාගත කිරීම
    const audioRes = await axios.get(audio_url, {
      responseType: 'arraybuffer',
      timeout: 45000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    let buffer = Buffer.from(audioRes.data);

    // 2. ID3 Metadata Tags ලිවීම
    if (NodeID3) {
      try {
        const tags = {
          title: song_title,
          artist: "Viru Beatz",
          composer: "Viruna Randinu",
          performerInfo: "Viru Beatz",
          album: "Viru Beatz AI Studio",
          year: "2026",
          copyright: "Copyright 2026 Viruna Randinu. All Rights Reserved.",
          comment: {
            language: "eng",
            text: "Powered by Viru Beatz - Produced by Viruna Randinu"
          }
        };

        const taggedBuffer = NodeID3.write(tags, buffer);
        if (taggedBuffer && Buffer.isBuffer(taggedBuffer)) {
          buffer = taggedBuffer;
        }
      } catch (tagErr) {
        console.error('ID3 Tag write warning:', tagErr);
      }
    }

    // 3. MP3 File එක Browser එකට Stream කිරීම
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(song_title)}.mp3"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);

  } catch (error) {
    // Fallback: කිසියම් දෝෂයක් ආවද සෘජුවම audio_url එකට redirect වී Download වේ
    return res.redirect(302, audio_url);
  }
};
