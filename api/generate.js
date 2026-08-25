const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// Free / Fast Rotating Proxy Gateways
const PROXY_GATEWAYS = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => url // Direct Fallback
];

function buildFinalPromptAndLyrics(userLyrics, style, voice) {
  const cleanUserLyrics = userLyrics.replace(/[\u0D80-\u0DFF]/g, '').trim();
  let vocalInstruction = "Vocals: Professional studio vocals.";
  let introTag = `[Intro: Female Spoken Whisper]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;

  if (voice === 'female') {
    vocalInstruction = "Vocals: Smooth, melodic female vocals throughout.";
    introTag = `[Intro: Female Spoken Whisper]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;
  } else if (voice === 'male') {
    vocalInstruction = "Vocals: Energetic, clear male vocals throughout.";
    introTag = `[Intro: Male Voice]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;
  } else if (voice === 'collab' || voice === 'duet' || voice === 'both') {
    vocalInstruction = "Vocals: Dynamic male and female collaboration duet vocals.";
    introTag = `[Intro: Collab Voice]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;
  }

  const finalLyrics = `${introTag}${cleanUserLyrics}`;
  const finalPrompt = `Style: ${style}. ${vocalInstruction} Intro starts with 'Powered by Viru Beatz' followed by a dynamic beat drop.`;

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
    const anonymousUserId = crypto.randomUUID();
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
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    let songData = null;
    let lastError = null;

    // Proxy Gateways හරහා මාරුවෙන් මාරුවට Request එක යැවීම (Auto-Bypass)
    for (const getProxyUrl of PROXY_GATEWAYS) {
      try {
        const targetEndpoint = getProxyUrl(REMUSIC_API_ENDPOINT);
        const response = await axios.post(targetEndpoint, payload, { headers, timeout: 25000 });

        if (response.data && response.data.code === 100000 && response.data.data) {
          songData = response.data.data[0];
          break; // සාර්ථක වූ සැණින් Loop එක නවත්වන්න
        } else {
          lastError = response.data;
        }
      } catch (err) {
        lastError = err.response ? err.response.data : err.message;
      }
    }

    if (!songData) {
      return res.status(400).send(JSON.stringify({
        error: "All gateways busy. Please try again in 5 seconds.",
        details: lastError
      }, null, 2));
    }

    const songId = songData.song_id;
    const finalTitle = songData.title || cleanTitle;
    const rawImage = songData.image_large_url || songData.image_url || "https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp";

    const brandedImageUrl = `https://${req.headers.host}/api/cover?title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&voice=${encodeURIComponent(voice)}&img=${encodeURIComponent(rawImage)}`;

    const cleanOutput = {
      title: finalTitle,
      style: style,
      voice: voice,
      artist: "Viru Beatz",
      owner: "Viruna Randinu",
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
