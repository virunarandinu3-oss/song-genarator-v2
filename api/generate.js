const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// Vocal Selection & Producer Tag Builder
function buildFinalPromptAndLyrics(userLyrics, style, voice) {
  const cleanUserLyrics = userLyrics.replace(/[\u0D80-\u0DFF]/g, '').trim();
  
  let vocalInstruction = "Vocals: Professional studio vocals.";
  let introTag = `[Intro]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;

  if (voice === 'female') {
    vocalInstruction = "Vocals: Smooth, melodic female vocals throughout.";
    introTag = `[Intro: Female Voice]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;
  } else if (voice === 'male') {
    vocalInstruction = "Vocals: Energetic, clear male vocals throughout.";
    introTag = `[Intro: Male Voice]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;
  } else if (voice === 'collab' || voice === 'duet' || voice === 'both') {
    vocalInstruction = "Vocals: Dynamic male and female collaboration duet vocals.";
    introTag = `[Intro: Collab Voice]\nPowered by Viru Beatz\n[Beat Drop]\n\n`;
  }

  const finalLyrics = `${introTag}${cleanUserLyrics}`;
  const finalPrompt = `Style: ${style}. ${vocalInstruction} Intro starts smoothly with spoken 'Powered by Viru Beatz' before the beat drop.`;

  return { finalLyrics, finalPrompt };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Response එක ගිය පසු Auto-Deploy Hook තිබේ නම් background එකේ trigger කිරීම
  res.on('finish', () => {
    if (process.env.VERCEL_DEPLOY_HOOK) {
      axios.post(process.env.VERCEL_DEPLOY_HOOK).catch(() => {});
    }
  });

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    lyrics = '',
    style = 'Pop, EDM, Dance',
    voice = 'collab',           // 'male', 'female', 'collab'
    title = '',
    mode = 'pro',
    instrumental = false,
    token = process.env.REMUSIC_TOKEN || ''
  } = params;

  if (!lyrics && !instrumental) {
    return res.status(400).send(JSON.stringify({
      error: "Field 'lyrics' is required for song generation.",
      example_usage: `https://${req.headers.host}/api/generate?lyrics=Feel+the+energy+rise+up+tonight&style=EDM,Club&voice=male&title=Rise+Up&mode=pro`
    }, null, 2));
  }

  try {
    // Fresh Dynamic Anonymous Identity
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
      'cookie': `anonymous_user_id=${anonymousUserId}; dashboard-sidebar-v-0-0=%7B%22size%22%3A15%2C%22collapsed%22%3Afalse%7D${token ? `; token=${token}` : ''}`,
      'origin': 'https://remusic.ai',
      'priority': 'u=1, i',
      'referer': 'https://remusic.ai/ai-music-generator',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (token) {
      headers['authorization'] = `Bearer ${token}`;
      headers['x-token'] = token;
    }

    const response = await axios.post(REMUSIC_API_ENDPOINT, payload, { headers, timeout: 25000 });

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
    const errorDetails = error.response ? error.response.data : error.message;
    return res.status(error.response ? error.response.status : 500).send(JSON.stringify({
      error: "Generation Failed",
      details: errorDetails
    }, null, 2));
  }
};
