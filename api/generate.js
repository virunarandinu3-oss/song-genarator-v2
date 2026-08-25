const axios = require('axios');
const NodeID3 = require('node-id3');

const REMUSIC_BASE = 'https://remusic.ai';

// 1. Producer Tag Injection Function
function injectProducerTag(userLyrics, userPrompt, mode) {
  const producerTagLyrics = `[Spoken Intro / Whisper]\n"Powered by Viru Beatz"\n\n`;

  if (mode === 'custom') {
    return {
      finalLyrics: producerTagLyrics + (userLyrics || ''),
      finalPrompt: userPrompt
    };
  } else {
    const injectedPrompt = `Start with a subtle spoken producer tag: "Powered by Viru Beatz". Then continue with: ${userPrompt}`;
    return {
      finalLyrics: producerTagLyrics,
      finalPrompt: injectedPrompt
    };
  }
}

// 2. Main Serverless API Handler
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-remusic-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Please send a POST request with JSON body.'
    });
  }

  const {
    prompt = '',
    lyrics_mode = 'auto',       // 'auto' හෝ 'custom'
    custom_lyrics = '',
    style = 'Pop, Electronic',
    mode = 'pro',               // 'normal' හෝ 'pro'
    instrumental = false,
    auth_token = process.env.REMUSIC_TOKEN || '' // Optional Vercel Env token
  } = req.body;

  if (!prompt && lyrics_mode === 'auto') {
    return res.status(400).json({
      success: false,
      error: 'Field "prompt" is required when lyrics_mode is "auto".'
    });
  }

  try {
    // 1. User ට නොපෙනී Producer Tag එක Inject කිරීම
    const { finalLyrics, finalPrompt } = injectProducerTag(custom_lyrics, prompt, lyrics_mode);

    // 2. Remusic Payload සකස් කිරීම
    const payload = {
      prompt: finalPrompt,
      style: style,
      lyrics: instrumental ? '' : finalLyrics,
      is_instrumental: instrumental,
      model: mode === 'pro' ? 'remusic-v5' : 'remusic-v4'
    };

    // 3. API Headers
    const headers = {
      'Host': 'remusic.ai',
      'Origin': REMUSIC_BASE,
      'Referer': `${REMUSIC_BASE}/ai-music-generator`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    };

    if (auth_token) {
      headers['Authorization'] = `Bearer ${auth_token}`;
      headers['Cookie'] = `token=${auth_token};`;
    }

    // 4. Remusic API Call
    const remusicRes = await axios.post(`${REMUSIC_BASE}/api/v1/song/generate`, payload, {
      headers: headers,
      timeout: 60000
    });

    const responseData = remusicRes.data;

    // 5. Success Response
    return res.status(200).json({
      success: true,
      branding: {
        artist: "Viru Beatz",
        owner: "Viruna Randinu",
        tag: "Powered by Viru Beatz",
        copyright: "Copyright 2026 Viruna Randinu"
      },
      configuration: {
        mode: mode,
        lyrics_mode: lyrics_mode,
        instrumental: instrumental,
        style: style
      },
      result: responseData
    });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    return res.status(error.response ? error.response.status : 500).json({
      success: false,
      error: "Music Generation Failed",
      details: errorDetails
    });
  }
};
