const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// Producer Tag & Prompt Builder
function buildFinalPrompt(prompt, style, customLyrics, lyricsMode) {
  const cleanPrompt = prompt.replace(/[\u0D80-\u0DFF]/g, '').trim();
  const producerTag = `[Intro]\n(Powered by Viru Beatz)\n\n`;

  if (lyricsMode === 'custom' && customLyrics) {
    return `${producerTag}${customLyrics}\n\n[Style: ${style}, English Vocals Only]`;
  } else {
    return `[Intro: (Powered by Viru Beatz)]\nStart with the spoken intro line: "Powered by Viru Beatz"\n${cleanPrompt}\nGenre: ${style}\nVocals: English studio vocals only.`;
  }
}

// Lyrics Formatting Helper
function formatLyrics(rawLyrics) {
  if (!rawLyrics) return "";
  return rawLyrics
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    prompt = '',
    lyrics_mode = 'auto',
    custom_lyrics = '',
    style = 'EDM, Dance, Pop',
    mode = 'pro',
    instrumental = false,
    token = process.env.REMUSIC_TOKEN || ''
  } = params;

  if (!prompt && lyrics_mode === 'auto') {
    return res.status(400).send(JSON.stringify({
      error: "Prompt is required.",
      usage: `https://${req.headers.host}/api/generate?prompt=Fast+club+banger&style=EDM,Pop&mode=pro`
    }, null, 2));
  }

  try {
    const anonymousUserId = crypto.randomUUID();
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
    const title = songData.title || prompt;
    const formattedLyrics = formatLyrics(songData.lyrics);

    // පිරිසිදු කෙටි Output එක (No percentage, No success, No stream/download links)
    const cleanInitialOutput = {
      title: title,
      artist: "Viru Beatz",
      owner: "Viruna Randinu",
      song_id: songId,
      check_status_url: songId ? `https://${req.headers.host}/api/status?song_id=${songId}` : null,
      lyrics: formattedLyrics
    };

    return res.status(200).send(JSON.stringify(cleanInitialOutput, null, 2));

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    return res.status(error.response ? error.response.status : 500).send(JSON.stringify({
      error: "Generation Failed",
      details: errorDetails
    }, null, 2));
  }
};
