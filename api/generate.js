const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// Female Whisper Producer Tag Builder
function buildFinalLyrics(userLyrics) {
  const cleanUserLyrics = userLyrics.replace(/[\u0D80-\u0DFF]/g, '').trim();
  return `[Intro: Female Spoken Whisper]\n[Female Voice: "Powered by Viru Beatz"]\n[Beat Drop]\n\n${cleanUserLyrics}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Response එක ගිය සැණින් Container එක Clean Reset කිරීම
  res.on('finish', () => {
    setTimeout(() => {
      try { process.exit(0); } catch (e) {}
    }, 50);
  });

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    lyrics = '',
    style = 'Pop, EDM, Dance',
    title = '',
    mode = 'pro',
    instrumental = false,
    token = process.env.REMUSIC_TOKEN || ''
  } = params;

  if (!lyrics && !instrumental) {
    return res.status(400).send(JSON.stringify({
      error: "Field 'lyrics' is required for song generation.",
      example_usage: `https://${req.headers.host}/api/generate?lyrics=Dancing+in+the+neon+light+all+night&style=EDM,Dance&title=Neon+Party&mode=pro`
    }, null, 2));
  }

  try {
    const anonymousUserId = crypto.randomUUID();
    const finalLyrics = buildFinalLyrics(lyrics);
    const isInstrumentalBool = String(instrumental).toLowerCase() === 'true';
    const cleanTitle = title || (lyrics ? lyrics.split('\n')[0].substring(0, 30) : "Viru Beatz Track");

    const promptWithFemaleIntro = `Style: ${style}. Song intro starts with a sexy female spoken whisper voice tag: "Powered by Viru Beatz", followed by a heavy energetic beat drop.`;

    const payload = {
      mode: 2,
      supplier: 12,
      prompt: promptWithFemaleIntro,
      lyrics: isInstrumentalBool ? '' : finalLyrics,
      title: cleanTitle,
      is_instrumental: isInstrumentalBool,
      is_public: true,
      mv: mode === 'normal' ? 'v4' : 'v5'
    };

    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'cookie': `anonymous_user_id=${anonymousUserId}; dashboard-sidebar-v-0-0=%7B%22size%22%3A15%2C%22collapsed%22%3Afalse%7D${token ? `; token=${token}` : ''}`,
      'origin': 'https://remusic.ai',
      'priority': 'u=1, i',
      'referer': 'https://remusic.ai/ai-music-generator',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    if (token) {
      headers['authorization'] = `Bearer ${token}`;
      headers['x-token'] = token;
    }

    const response = await axios.post(REMUSIC_API_ENDPOINT, payload, { headers, timeout: 20000 });

    if (response.data.code !== 100000 || !response.data.data) {
      return res.status(400).send(JSON.stringify({
        error: response.data.message || "Generation rejected",
        details: response.data
      }, null, 2));
    }

    const songData = response.data.data[0] || {};
    const songId = songData.song_id;
    const finalTitle = songData.title || cleanTitle;
    const rawImage = songData.image_large_url || songData.image_url || "https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp";

    // Viru Beatz Branded Cover Image URL
    const brandedImageUrl = `https://${req.headers.host}/api/cover?title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&img=${encodeURIComponent(rawImage)}`;

    const cleanOutput = {
      title: finalTitle,
      style: style,
      artist: "Viru Beatz",
      owner: "Viruna Randinu",
      image_url: brandedImageUrl,
      check_status_url: `https://${req.headers.host}/api/status?song_id=${songId}`
    };

    return res.status(200).send(JSON.stringify(cleanOutput, null, 2));

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    return res.status(error.response ? error.response.status : 500).send(JSON.stringify({
      error: "Generation Failed",
      details: errorDetails
    }, null, 2));
  }
};
