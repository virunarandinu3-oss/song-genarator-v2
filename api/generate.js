const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// Ultra-Fast Rotating Edge Gateways (< 2s Response)
const FAST_ROTATING_GATEWAYS = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => url // Direct High-Speed Fallback
];

// Random Dynamic Residential IP Generator
function getRandomResidentialIp() {
  const prefixes = [112, 122, 175, 182, 103, 49, 117, 203];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${p}.${Math.floor(Math.random() * 250 + 1)}.${Math.floor(Math.random() * 250 + 1)}.${Math.floor(Math.random() * 250 + 1)}`;
}

function buildFinalPromptAndLyrics(userLyrics, style, voice) {
  const cleanUserLyrics = userLyrics.replace(/[\u0D80-\u0DFF]/g, '').trim();
  
  let vocalInstruction = "Vocals: Professional studio vocals.";
  if (voice === 'female') {
    vocalInstruction = "Vocals: Smooth, melodic female vocals throughout.";
  } else if (voice === 'male') {
    vocalInstruction = "Vocals: Energetic, clear male vocals throughout.";
  } else if (voice === 'collab' || voice === 'duet' || voice === 'both') {
    vocalInstruction = "Vocals: Dynamic male and female collaboration duet vocals.";
  }

  const finalLyrics = cleanUserLyrics;
  const finalPrompt = `Style: ${style}. ${vocalInstruction}`;

  return { finalLyrics, finalPrompt };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    lyrics = '',
    style = 'Pop, EDM, Dance',
    voice = 'collab',
    title = '',
    mode = 'pro',
    instrumental = false
  } = params;

  if (!lyrics && !instrumental) {
    return res.status(400).send(JSON.stringify({
      error: "Field 'lyrics' is required for song generation.",
      example_usage: `https://${req.headers.host}/api/generate?lyrics=Dancing+in+the+neon+light+all+night&style=EDM,Dance&voice=collab&title=Neon+Party&mode=pro`
    }, null, 2));
  }

  try {
    const { finalLyrics, finalPrompt } = buildFinalPromptAndLyrics(lyrics, style, voice);
    const isInstrumentalBool = String(instrumental).toLowerCase() === 'true';
    const cleanTitle = title || (lyrics ? lyrics.split('\n')[0].substring(0, 30) : "Viru Beatz Track");

    const payload = {
      mode: 2,
      supplier: 12,
      prompt: finalPrompt,
      lyrics: isInstrumentalBool ? '' : finalLyrics,
      title: cleanTitle,
      is_instrumental: isInstrumentalBool,
      is_public: true,
      mv: mode === 'normal' ? 'v4' : 'v5'
    };

    let songData = null;
    let lastError = null;

    // Fast Rotating Gateways හරහා තත්පර 3-4ක Fast Timeout එකක් සහිතව Request එක යැවීම
    for (const getGatewayUrl of FAST_ROTATING_GATEWAYS) {
      const anonymousUserId = crypto.randomUUID();
      const randomIp = getRandomResidentialIp();

      const headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'cookie': `anonymous_user_id=${anonymousUserId}; dashboard-sidebar-v-0-0=%7B%22size%22%3A15%2C%22collapsed%22%3Afalse%7D`,
        'origin': 'https://remusic.ai',
        'priority': 'u=1, i',
        'referer': 'https://remusic.ai/ai-music-generator',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'X-Forwarded-For': randomIp,
        'X-Real-IP': randomIp
      };

      try {
        const targetUrl = getGatewayUrl(REMUSIC_API_ENDPOINT);
        const response = await axios.post(targetUrl, payload, { headers, timeout: 4500 });

        if (response.data && response.data.code === 100000 && response.data.data) {
          songData = response.data.data[0];
          break; // සාර්ථක වූ සැණින් එළියට එන්න
        } else {
          lastError = response.data;
        }
      } catch (err) {
        lastError = err.response ? err.response.data : err.message;
      }
    }

    if (!songData) {
      return res.status(400).send(JSON.stringify({
        error: "All fast channels busy. Retrying...",
        details: lastError
      }, null, 2));
    }

    const songId = songData.song_id;
    const finalTitle = songData.title || cleanTitle;
    const rawImage = songData.image_large_url || songData.image_url || "https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp";
    const brandedImageUrl = `https://${req.headers.host}/api/cover?title=${encodeURIComponent(finalTitle)}&img=${encodeURIComponent(rawImage)}`;

    const cleanOutput = {
      api_created_by: "Viruna Randinu",
      powered_by: "VIRU Beatz",
      title: finalTitle,
      style: style,
      voice: voice,
      image_url: brandedImageUrl,
      check_status_url: `https://${req.headers.host}/api/status?song_id=${songId}`
    };

    return res.status(200).send(JSON.stringify(cleanOutput, null, 2));

  } catch (error) {
    return res.status(500).send(JSON.stringify({
      error: "Generation Failed",
      details: error.message
    }, null, 2));
  }
};
