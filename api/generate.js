const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// Producer Tag Injection
function buildFinalPrompt(prompt, style, customLyrics, lyricsMode) {
  const producerTag = `[Spoken Intro / Whisper]\n"Powered by Viru Beatz"\n\n`;

  if (lyricsMode === 'custom' && customLyrics) {
    return `${producerTag}${customLyrics}\nStyle: ${style}`;
  } else {
    return `[Intro: Spoken "Powered by Viru Beatz"]\n${prompt}\n${style}`;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET (Query Parameters) හෝ POST (Request Body) මඟින් දත්ත ලබාගැනීම
  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    prompt = '',
    lyrics_mode = 'auto',       // 'auto' හෝ 'custom'
    custom_lyrics = '',
    style = 'Happy, Pop',
    mode = 'pro',               // 'normal' (v4) හෝ 'pro' (v5)
    instrumental = false
  } = params;

  // Prompt එක නොමැති නම් උපදෙස් පෙන්වීම
  if (!prompt && lyrics_mode === 'auto') {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required.',
      example_usage: `https://${req.headers.host}/api/generate?prompt=Sinhala+Baila+remix&style=EDM,Dance&mode=pro`
    });
  }

  try {
    // 1. Random User Session ID
    const anonymousUserId = crypto.randomUUID();

    // 2. Producer Tag Inject කිරීම
    const finalPrompt = buildFinalPrompt(prompt, style, custom_lyrics, lyrics_mode);

    // 3. Payload
    const isInstrumentalBool = String(instrumental).toLowerCase() === 'true';
    const payload = {
      mode: lyrics_mode === 'custom' ? 2 : 1,
      supplier: 12,
      prompt: finalPrompt,
      is_instrumental: isInstrumentalBool,
      is_public: true,
      mv: mode === 'normal' ? 'v4' : 'v5'
    };

    // 4. Headers
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,si;q=0.7',
      'content-type': 'application/json',
      'cookie': `anonymous_user_id=${anonymousUserId}; dashboard-sidebar-v-0-0=%7B%22size%22%3A15%2C%22collapsed%22%3Afalse%7D`,
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

    // 5. Remusic වෙත Request එක යැවීම
    const response = await axios.post(REMUSIC_API_ENDPOINT, payload, {
      headers: headers,
      timeout: 60000
    });

    const songData = response.data?.data?.[0] || {};

    return res.status(200).json({
      success: true,
      branding: {
        artist: "Viru Beatz",
        owner: "Viruna Randinu",
        tag: "Powered by Viru Beatz",
        copyright: "Copyright 2026 Viruna Randinu"
      },
      song_id: songData.song_id || null,
      status: songData.status || "pending",
      title: songData.title || prompt,
      lyrics: songData.lyrics || "",
      check_status_url: songData.song_id ? `https://${req.headers.host}/api/status?song_id=${songData.song_id}` : null,
      result: response.data
    });

  } catch (error) {
    return res.status(error.response ? error.response.status : 500).json({
      success: false,
      error: "Generation Request Failed",
      details: error.response ? error.response.data : error.message
    });
  }
};
