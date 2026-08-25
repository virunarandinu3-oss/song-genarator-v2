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
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    prompt = '',
    song_id = '',
    lyrics_mode = 'auto',
    custom_lyrics = '',
    style = 'Happy, Pop, Electronic',
    mode = 'pro',
    instrumental = false,
    token = process.env.REMUSIC_TOKEN || ''
  } = params;

  const anonymousUserId = crypto.randomUUID();
  const headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,si;q=0.7',
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

  try {
    // 1. SCENARIO 1: Check Status by song_id (Instant Status Check)
    if (song_id) {
      let songData = null;
      try {
        const resp = await axios.post('https://remusic.ai/api/v1/ai-music/music/detail', { song_id }, { headers, timeout: 10000 });
        songData = resp.data?.data?.[0] || resp.data?.data || resp.data;
      } catch (e) {}

      if (songData) {
        const audioUrl = songData.audio_url || songData.url || '';
        const isComplete = songData.status === 'complete' || songData.status === 'completed' || !!audioUrl;
        const percentage = songData.percentage || (isComplete ? 100 : 50);
        const title = songData.title || 'Viru Beatz Track';

        const jsonOutput = {
          success: true,
          branding: {
            artist: "Viru Beatz",
            owner: "Viruna Randinu",
            tag: "Powered by Viru Beatz",
            copyright: "Copyright 2026 Viruna Randinu"
          },
          song_id: song_id,
          status: isComplete ? "complete" : (songData.status || "rendering"),
          percentage: `${percentage}%`,
          title: title,
          stream_link: audioUrl || null,
          download_link: audioUrl ? `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}` : null,
          lyrics: songData.lyrics || "",
          check_status_url: `https://${req.headers.host}/api/generate?song_id=${song_id}`
        };

        return res.status(200).send(JSON.stringify(jsonOutput, null, 2));
      }
    }

    // 2. SCENARIO 2: Create New Song (Instant 1-Second Response)
    if (!prompt && lyrics_mode === 'auto') {
      return res.status(400).send(JSON.stringify({
        success: false,
        error: "Parameter 'prompt' is required to create a song.",
        usage_example: `https://${req.headers.host}/api/generate?prompt=Sinhala+Baila+remix&style=EDM&mode=pro`
      }, null, 2));
    }

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

    const initialRes = await axios.post(REMUSIC_API_ENDPOINT, payload, { headers, timeout: 15000 });
    const songData = initialRes.data?.data?.[0] || {};
    const createdSongId = songData.song_id || null;
    const title = songData.title || prompt;
    const audioUrl = songData.audio_url || '';

    const jsonOutput = {
      success: true,
      branding: {
        artist: "Viru Beatz",
        owner: "Viruna Randinu",
        tag: "Powered by Viru Beatz",
        copyright: "Copyright 2026 Viruna Randinu"
      },
      song_id: createdSongId,
      status: songData.status || "pending",
      percentage: `${songData.percentage || 4}%`,
      title: title,
      stream_link: audioUrl || null,
      download_link: audioUrl ? `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}` : null,
      lyrics: songData.lyrics || "",
      check_status_url: createdSongId ? `https://${req.headers.host}/api/generate?song_id=${createdSongId}` : null
    };

    return res.status(200).send(JSON.stringify(jsonOutput, null, 2));

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    return res.status(error.response ? error.response.status : 500).send(JSON.stringify({
      success: false,
      error: "Generation Failed",
      details: errorDetails
    }, null, 2));
  }
};
