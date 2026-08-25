const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// 1. Rotating Real Browser Fingerprints (User-Agents & Client Hints)
const BROWSER_FINGERPRINTS = [
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    platform: '"Windows"',
    sec_ua: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"'
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    platform: '"macOS"',
    sec_ua: '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"'
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
    platform: '"Windows"',
    sec_ua: '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"'
  },
  {
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    platform: '"Linux"',
    sec_ua: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"'
  }
];

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

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    prompt = '',
    lyrics_mode = 'auto',
    custom_lyrics = '',
    style = 'Happy, Pop',
    mode = 'pro',
    instrumental = false
  } = params;

  if (!prompt && lyrics_mode === 'auto') {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required.'
    });
  }

  try {
    // 1. සෑම Request එකකටම සම්පූර්ණයෙන්ම අලුත් Guest User ID එකක් සහ Cache Reset එකක්
    const freshAnonymousUserId = crypto.randomUUID();
    const randomDeviceId = crypto.randomBytes(8).toString('hex');
    
    // 2. අහඹු Browser Fingerprint එකක් තෝරාගැනීම
    const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];

    // 3. Producer Tag එකතු කළ Prompt එක
    const finalPrompt = buildFinalPrompt(prompt, style, custom_lyrics, lyrics_mode);
    const isInstrumentalBool = String(instrumental).toLowerCase() === 'true';

    const payload = {
      mode: lyrics_mode === 'custom' ? 2 : 1,
      supplier: 12,
      prompt: finalPrompt,
      is_instrumental: isInstrumentalBool,
      is_public: true,
      mv: mode === 'normal' ? 'v4' : 'v5'
    };

    // 4. Fresh Browser Headers & Cookies
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'cookie': `anonymous_user_id=${freshAnonymousUserId}; _ga=GA1.1.${Math.floor(Math.random()*1000000000)}.${Math.floor(Date.now()/1000)}; dashboard-sidebar-v-0-0=%7B%22size%22%3A15%2C%22collapsed%22%3Afalse%7D`,
      'origin': 'https://remusic.ai',
      'priority': 'u=1, i',
      'referer': 'https://remusic.ai/ai-music-generator',
      'sec-ch-ua': fingerprint.sec_ua,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': fingerprint.platform,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': fingerprint.ua
    };

    // 5. Remusic API Call
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
      fresh_session_id: freshAnonymousUserId,
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
