const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';

// 1. Rotating Browser Fingerprints
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
  }
];

// 2. Secret Producer Tag Injection
function buildFinalPrompt(prompt, style, customLyrics, lyricsMode) {
  const producerTag = `[Spoken Intro / Whisper]\n"Powered by Viru Beatz"\n\n`;
  if (lyricsMode === 'custom' && customLyrics) {
    return `${producerTag}${customLyrics}\nStyle: ${style}`;
  } else {
    return `[Intro: Spoken "Powered by Viru Beatz"]\n${prompt}\n${style}`;
  }
}

// 3. Polling Helper (Audio එක Render වන තුරු Backend එකෙන්ම රැඳී සිටීම)
async function pollForAudio(songId, headers, maxAttempts = 10, delayMs = 3500) {
  const candidateEndpoints = [
    () => axios.post(`https://remusic.ai/api/v1/ai-music/music/detail`, { song_id: songId }, { headers }),
    () => axios.get(`https://remusic.ai/api/v1/ai-music/music/${songId}`, { headers }),
    () => axios.get(`https://remusic.ai/api/v1/ai-music/music?song_id=${songId}`, { headers })
  ];

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    for (const fetchReq of candidateEndpoints) {
      try {
        const res = await fetchReq();
        const data = res.data?.data?.[0] || res.data?.data || res.data || {};
        if (data.audio_url || data.url || data.status === 'complete' || data.status === 'completed') {
          return data;
        }
      } catch (e) {
        // Continue fallback attempts
      }
    }
  }
  return null;
}

// 4. Pretty HTML Page Renderer for Browser
function renderPrettyHTML(songData, downloadUrl, rawJson) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${songData.title || 'Viru Beatz AI Track'}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 25px 15px; margin: 0; }
    .card { max-width: 650px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 30px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
    h1 { color: #38bdf8; margin: 0 0 5px 0; font-size: 24px; text-align: center; }
    .badge { display: inline-block; background: #0369a1; color: #e0f2fe; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 20px; text-align: center; }
    .badge-center { text-align: center; }
    .tagline { color: #94a3b8; font-size: 13px; text-align: center; margin-bottom: 20px; }
    .audio-player { width: 100%; margin: 20px 0; border-radius: 8px; }
    .btn-download { display: block; background: #10b981; color: #ffffff; text-align: center; padding: 14px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 16px; margin: 15px 0; transition: background 0.2s; }
    .btn-download:hover { background: #059669; }
    .lyrics-box { background: #0f172a; padding: 15px; border-radius: 10px; border: 1px solid #334155; white-space: pre-wrap; font-size: 13px; color: #cbd5e1; max-height: 250px; overflow-y: auto; line-height: 1.6; }
    .lyrics-title { font-weight: bold; color: #38bdf8; margin-top: 15px; margin-bottom: 8px; font-size: 14px; }
    pre.json-box { background: #020617; padding: 15px; border-radius: 8px; font-size: 11px; color: #38bdf8; overflow-x: auto; max-height: 150px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎵 ${songData.title || 'Viru Beatz AI Track'}</h1>
    <p class="tagline">Produced by Viruna Randinu | Artist: Viru Beatz</p>
    <div class="badge-center"><span class="badge">Status: ${songData.audio_url ? 'Completed ✅' : 'Rendering ⏳'}</span></div>

    ${songData.audio_url ? `
      <audio controls autoplay class="audio-player" src="${songData.audio_url}"></audio>
      <a class="btn-download" href="${downloadUrl}" target="_blank">⬇ Download MP3 (With Viru Beatz Metadata)</a>
    ` : `<p style="text-align: center; color: #fbbf24;">Song is rendering on server. Please refresh in a few seconds.</p>`}

    <div class="lyrics-title">📝 Generated Lyrics (With Producer Tag):</div>
    <div class="lyrics-box">${songData.lyrics || 'No lyrics available.'}</div>

    <div class="lyrics-title" style="margin-top: 20px;">⚙ Raw API Response (JSON):</div>
    <pre class="json-box">${JSON.stringify(rawJson, null, 2)}</pre>
  </div>
</body>
</html>`;
}

// 5. Main Handler
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
    style = 'Happy, Pop, Electronic',
    mode = 'pro',
    instrumental = false,
    format = '' // format=json දැමුවහොත් direct JSON response ලබාදේ
  } = params;

  if (!prompt && lyrics_mode === 'auto') {
    return res.status(400).json({
      success: false,
      error: "Prompt is required.",
      usage: `https://${req.headers.host}/api/generate?prompt=Sri+Lankan+Baila&style=EDM&mode=pro`
    });
  }

  try {
    // Fresh Incognito Identity Generation
    const freshAnonymousUserId = crypto.randomUUID();
    const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];

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

    // Step 1: Create Song
    const initialRes = await axios.post(REMUSIC_API_ENDPOINT, payload, { headers, timeout: 60000 });
    const initialData = initialRes.data?.data?.[0] || {};
    const songId = initialData.song_id;

    if (!songId) {
      return res.status(200).json({ success: false, message: "Creation failed", details: initialRes.data });
    }

    // Step 2: Auto-Poll for Completed Audio
    const completedSong = await pollForAudio(songId, headers, 12, 3500);
    const audioUrl = completedSong?.audio_url || completedSong?.url || initialData.audio_url || '';
    const title = completedSong?.title || initialData.title || prompt;
    const lyrics = completedSong?.lyrics || initialData.lyrics || '';

    const downloadLink = audioUrl ? `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}` : null;

    const resultJson = {
      success: true,
      branding: {
        artist: "Viru Beatz",
        owner: "Viruna Randinu",
        tag: "Powered by Viru Beatz",
        copyright: "Copyright 2026 Viruna Randinu"
      },
      song_id: songId,
      status: audioUrl ? "complete" : "rendering",
      title: title,
      audio_url: audioUrl,
      lyrics: lyrics,
      download_mp3: downloadLink
    };

    // Browser එකෙන් open කළ විට ලස්සන HTML UI එක පෙන්වීම (format=json නොවේ නම්)
    if (req.method === 'GET' && format !== 'json' && (!req.headers.accept || req.headers.accept.includes('text/html'))) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderPrettyHTML(resultJson, downloadLink, resultJson));
    }

    // API / cURL හරහා පැමිණි විට Pretty JSON ලබාදීම
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(resultJson, null, 2));

  } catch (error) {
    return res.status(error.response ? error.response.status : 500).json({
      success: false,
      error: "Generation Request Failed",
      details: error.response ? error.response.data : error.message
    });
  }
};
