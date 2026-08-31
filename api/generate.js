const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

let liveProxyCache = [];
let lastProxyFetch = 0;

async function getDynamicProxy() {
  const now = Date.now();
  if (liveProxyCache.length < 10 || (now - lastProxyFetch > 300000)) {
    try {
      const res = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=yes&anonymity=elite', { timeout: 6000 });
      const list = res.data.split('\r\n').map(p => p.trim()).filter(p => p && p.includes(':')).map(p => `http://${p}`);
      if (list.length > 0) {
        liveProxyCache = list;
        lastProxyFetch = now;
      }
    } catch (e) {}
  }

  if (liveProxyCache.length > 0) {
    const randomProxyUrl = liveProxyCache[Math.floor(Math.random() * liveProxyCache.length)];
    try {
      return new HttpsProxyAgent(randomProxyUrl);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function buildFinalPromptAndLyrics(userLyrics, style, voice) {
  const cleanUserLyrics = userLyrics.replace(/[\u0D80-\u0DFF]/g, '').trim();
  
  let vocalInstruction = "Vocals: Professional studio vocals.";
  let introTag = `[Intro]\nPowered by VIRU Beatz\n[Beat Drop]\n\n`;

  if (voice === 'female') {
    vocalInstruction = "Vocals: Smooth, melodic female vocals throughout.";
    introTag = `[Intro: Female Voice]\nPowered by VIRU Beatz\n[Beat Drop]\n\n`;
  } else if (voice === 'male') {
    vocalInstruction = "Vocals: Energetic, clear male vocals throughout.";
    introTag = `[Intro: Male Voice]\nPowered by VIRU Beatz\n[Beat Drop]\n\n`;
  } else if (voice === 'collab' || voice === 'duet' || voice === 'both') {
    vocalInstruction = "Vocals: Dynamic male and female collaboration duet vocals.";
    introTag = `[Intro: Collab Voice]\nPowered by VIRU Beatz\n[Beat Drop]\n\n`;
  }

  const finalLyrics = `${introTag}${cleanUserLyrics}`;
  const finalPrompt = `Style: ${style}. ${vocalInstruction} Intro starts with 'Powered by VIRU Beatz' before the beat drop.`;

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
    instrumental = false,
    token = process.env.REMUSIC_TOKEN || ''
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

    for (let attempt = 1; attempt <= 4; attempt++) {
      const anonymousUserId = crypto.randomUUID();
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

      const proxyAgent = await getDynamicProxy();
      const axiosConfig = {
        headers: headers,
        timeout: 15000,
        ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent } : {})
      };

      try {
        const response = await axios.post(REMUSIC_API_ENDPOINT, payload, axiosConfig);
        if (response.data && response.data.code === 100000 && response.data.data) {
          songData = response.data.data[0];
          break;
        } else {
          lastError = response.data;
        }
      } catch (err) {
        lastError = err.response ? err.response.data : err.message;
      }
    }

    if (!songData) {
      return res.status(400).send(JSON.stringify({
        error: "Server busy. Please try again in 10 seconds.",
        details: lastError
      }, null, 2));
    }

    const songId = songData.song_id;
    const finalTitle = songData.title || cleanTitle;
    const rawImage = songData.image_large_url || songData.image_url || "https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp";
    const brandedImageUrl = `https://${req.headers.host}/api/cover?title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&voice=${encodeURIComponent(voice)}&img=${encodeURIComponent(rawImage)}`;

    // Clean Output (Viruna Randinu / VIRU Beatz branding)
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
