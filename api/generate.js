const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    lyrics = '',                // User ගේ සාමාන්‍ය Lyrics
    style = 'Pop, EDM, Dance',  // Music Style
    title = '',                 // Song Title (Optional)
    mode = 'pro',               // 'pro' හෝ 'normal'
    instrumental = false,
    token = process.env.REMUSIC_TOKEN || ''
  } = params;

  if (!lyrics && !instrumental) {
    return res.status(400).send(JSON.stringify({
      error: "Field 'lyrics' is required for song generation.",
      example_usage: `https://${req.headers.host}/api/generate?lyrics=Dancing+in+the+neon+light+feel+the+rhythm+all+night&style=EDM,Dance,Club&title=Neon+Party&mode=pro`
    }, null, 2));
  }

  try {
    const anonymousUserId = crypto.randomUUID();

    // 1. User ට නොපෙනී Server එක ඇතුළෙන්ම "Powered by Viru Beatz" Voice Tag එක මුලටම Inject කිරීම
    const producerTag = `[Intro]\n(Powered by Viru Beatz)\n\n`;
    const cleanUserLyrics = lyrics.replace(/[\u0D80-\u0DFF]/g, '').trim();
    const finalLyrics = producerTag + cleanUserLyrics;

    const isInstrumentalBool = String(instrumental).toLowerCase() === 'true';
    const finalTitle = title || (cleanUserLyrics ? cleanUserLyrics.split('\n')[0].substring(0, 30) : "Viru Beatz Track");

    const payload = {
      mode: 2, // Manual / Custom Lyrics Mode
      supplier: 12,
      prompt: style,
      lyrics: isInstrumentalBool ? '' : finalLyrics,
      title: finalTitle,
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
      'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
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

    // Lyrics සම්පූර්ණයෙන්ම ඉවත් කළ Clean Initial Output
    const cleanOutput = {
      title: finalTitle,
      style: style,
      artist: "Viru Beatz",
      owner: "Viruna Randinu",
      song_id: songId,
      check_status_url: songId ? `https://${req.headers.host}/api/status?song_id=${songId}` : null
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
