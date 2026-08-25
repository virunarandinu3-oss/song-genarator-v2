const axios = require('axios');
const crypto = require('crypto');

const REMUSIC_API_ENDPOINT = 'https://remusic.ai/api/v1/ai-music/music';
const REMUSIC_BASE = 'https://remusic.ai';

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

  const params = req.method === 'GET' ? req.query : (req.body || {});

  const {
    prompt = '',
    lyrics = '',
    style = 'Pop, EDM, Dance',
    voice = 'collab',
    title = '',
    mode = 'pro',
    instrumental = false,
    song_id = '',
    img = '',
    t = '',
    token = process.env.REMUSIC_TOKEN || ''
  } = params;

  const actualLyrics = lyrics || prompt;

  const headers = {
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'origin': REMUSIC_BASE,
    'referer': `${REMUSIC_BASE}/ai-music-generator`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ...(token ? { 'authorization': `Bearer ${token}`, 'x-token': token } : {})
  };

  try {
    // ----------------------------------------------------
    // අදියර 2: Auto-Reload වෙමින් පවතින විට (Status Check)
    // ----------------------------------------------------
    if (song_id) {
      const candidateEndpoints = [
        () => axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music/detail`, { song_id }, { headers, timeout: 10000 }),
        () => axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music`, { song_id }, { headers, timeout: 10000 }),
        () => axios.get(`${REMUSIC_BASE}/api/v1/ai-music/music/${song_id}`, { headers, timeout: 10000 })
      ];

      let songData = null;
      for (const checkReq of candidateEndpoints) {
        try {
          const resp = await checkReq();
          if (resp.data && (resp.data.data || resp.data.code === 100000)) {
            songData = resp.data.data?.[0] || resp.data.data || resp.data;
            break;
          }
        } catch (e) {}
      }

      if (songData && typeof songData === 'object') {
        const audioUrl = songData.audio_url || songData.url || '';
        const isComplete = songData.status === 'complete' || songData.status === 'completed' || !!audioUrl;
        const finalTitle = title || songData.title || "Viru Beatz Track";
        const coverImg = img || songData.image_large_url || songData.image_url || "https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp";
        const brandedImageUrl = `https://${req.headers.host}/api/cover?title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&voice=${encodeURIComponent(voice)}&img=${encodeURIComponent(coverImg)}`;

        // ගීතය සෑදී අවසන් නම් (Complete) -> Auto-Reload නවත්වන්න
        if (isComplete && audioUrl) {
          return res.status(200).send(JSON.stringify({
            status: "complete",
            percentage: "100%",
            title: finalTitle,
            style: style,
            voice: voice,
            artist: "Viru Beatz",
            owner: "Viruna Randinu",
            image_url: brandedImageUrl,
            stream_link: audioUrl,
            download_link: `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(finalTitle)}`
          }, null, 2));
        }

        // තවමත් හැදෙමින් පවතී නම් -> Live Countdown & Next Auto-Refresh
        const startTime = Number(t) || (songData.create_time ? songData.create_time * 1000 : Date.now());
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const remainingSeconds = Math.max(1, 45 - elapsedSeconds);
        const progressPercentage = Math.min(95, Math.max(4, Math.floor((elapsedSeconds / 45) * 100)));

        res.setHeader('Refresh', `4; url=https://${req.headers.host}/api/generate?song_id=${song_id}&title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&voice=${encodeURIComponent(voice)}&img=${encodeURIComponent(coverImg)}&t=${startTime}`);

        return res.status(200).send(JSON.stringify({
          status: "rendering",
          percentage: `${songData.percentage ? songData.percentage + '%' : progressPercentage + '%'}`,
          countdown: `Please wait ${remainingSeconds} seconds...`,
          auto_refresh_in: "4 seconds",
          title: finalTitle,
          style: style,
          voice: voice,
          artist: "Viru Beatz",
          owner: "Viruna Randinu",
          image_url: brandedImageUrl,
          stream_link: null,
          download_link: null
        }, null, 2));
      }
    }

    // ----------------------------------------------------
    // අදියර 1: අලුතින් ගීතයක් සාදන මුල්ම අවස්ථාව
    // ----------------------------------------------------
    if (!actualLyrics && !instrumental) {
      return res.status(400).send(JSON.stringify({
        error: "Field 'lyrics' is required for song generation.",
        example_usage: `https://${req.headers.host}/api/generate?lyrics=Dancing+in+the+neon+light+all+night&style=EDM,Dance&voice=collab&title=Neon+Party&mode=pro`
      }, null, 2));
    }

    const anonymousUserId = crypto.randomUUID();
    const { finalLyrics, finalPrompt } = buildFinalPromptAndLyrics(actualLyrics, style, voice);
    const isInstrumentalBool = String(instrumental).toLowerCase() === 'true';
    const cleanTitle = title || (actualLyrics ? actualLyrics.split('\n')[0].substring(0, 30) : "Viru Beatz Track");

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

    const initialHeaders = {
      ...headers,
      'cookie': `anonymous_user_id=${anonymousUserId}; dashboard-sidebar-v-0-0=%7B%22size%22%3A15%2C%22collapsed%22%3Afalse%7D${token ? `; token=${token}` : ''}`,
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };

    const response = await axios.post(REMUSIC_API_ENDPOINT, payload, { headers: initialHeaders, timeout: 20000 });

    if (response.data.code !== 100000 || !response.data.data) {
      return res.status(400).send(JSON.stringify({
        error: response.data.message || "Generation rejected",
        details: response.data
      }, null, 2));
    }

    const songData = response.data.data[0] || {};
    const createdSongId = songData.song_id;
    const finalTitle = songData.title || cleanTitle;
    const rawImage = songData.image_large_url || songData.image_url || "https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp";
    const brandedImageUrl = `https://${req.headers.host}/api/cover?title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&voice=${encodeURIComponent(voice)}&img=${encodeURIComponent(rawImage)}`;

    // පළමු Output එකේදීම තත්පර 4කින් Auto-Refresh වීමට විධානය සැකසීම
    res.setHeader('Refresh', `4; url=https://${req.headers.host}/api/generate?song_id=${createdSongId}&title=${encodeURIComponent(finalTitle)}&style=${encodeURIComponent(style)}&voice=${encodeURIComponent(voice)}&img=${encodeURIComponent(rawImage)}&t=${Date.now()}`);

    const initialOutput = {
      status: "rendering",
      percentage: "4%",
      countdown: "Please wait 45 seconds...",
      auto_refresh_in: "4 seconds",
      title: finalTitle,
      style: style,
      voice: voice,
      artist: "Viru Beatz",
      owner: "Viruna Randinu",
      image_url: brandedImageUrl,
      stream_link: null,
      download_link: null
    };

    return res.status(200).send(JSON.stringify(initialOutput, null, 2));

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    return res.status(error.response ? error.response.status : 500).send(JSON.stringify({
      error: "Generation Failed",
      details: errorDetails
    }, null, 2));
  }
};
