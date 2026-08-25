const axios = require('axios');

const REMUSIC_BASE = 'https://remusic.ai';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { song_id, token = process.env.REMUSIC_TOKEN || '', t = '' } = req.query;

  if (!song_id) {
    return res.status(400).send(JSON.stringify({
      error: "Parameter 'song_id' is required"
    }, null, 2));
  }

  const headers = {
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'origin': REMUSIC_BASE,
    'referer': `${REMUSIC_BASE}/ai-music-generator`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ...(token ? { 'authorization': `Bearer ${token}`, 'x-token': token } : {})
  };

  const candidateEndpoints = [
    () => axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music/detail`, { song_id: song_id }, { headers, timeout: 10000 }),
    () => axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music`, { song_id: song_id }, { headers, timeout: 10000 }),
    () => axios.get(`${REMUSIC_BASE}/api/v1/ai-music/music/${song_id}`, { headers, timeout: 10000 })
  ];

  let songData = null;
  let lastError = null;

  for (const checkReq of candidateEndpoints) {
    try {
      const resp = await checkReq();
      if (resp.data && (resp.data.data || resp.data.code === 100000)) {
        songData = resp.data.data?.[0] || resp.data.data || resp.data;
        break;
      }
    } catch (err) {
      lastError = err.response ? err.response.data : err.message;
    }
  }

  if (songData && typeof songData === 'object') {
    const audioUrl = songData.audio_url || songData.url || '';
    const isComplete = songData.status === 'complete' || songData.status === 'completed' || !!audioUrl;
    const title = songData.title || "Viru Beatz Track";

    // 1. ගීතය සෑදී අවසන් නම් (Complete) -> Auto-Refresh නවත්වන්න
    if (isComplete && audioUrl) {
      return res.status(200).send(JSON.stringify({
        status: "complete",
        percentage: "100%",
        stream_link: audioUrl,
        download_link: `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}`
      }, null, 2));
    }

    // 2. ගීතය තවමත් හැදෙමින් පවතී නම් -> Countdown & Auto-Refresh Header
    const startTime = Number(t) || (songData.create_time ? songData.create_time * 1000 : Date.now());
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remainingSeconds = Math.max(1, 45 - elapsedSeconds);
    const progressPercentage = Math.min(95, Math.max(4, Math.floor((elapsedSeconds / 45) * 100)));

    // Browser එකට තත්පර 4කට වරක් Auto-Refresh වීමට විධානය යැවීම (විනාඩියකට 15 වතාවක්)
    res.setHeader('Refresh', `4; url=https://${req.headers.host}/api/status?song_id=${song_id}&t=${startTime}`);

    return res.status(200).send(JSON.stringify({
      status: "rendering",
      percentage: `${songData.percentage ? songData.percentage + '%' : progressPercentage + '%'}`,
      countdown: `Please wait ${remainingSeconds} seconds...`,
      auto_refresh_in: "4 seconds",
      stream_link: null,
      download_link: null
    }, null, 2));
  }

  return res.status(500).send(JSON.stringify({
    error: "Could not fetch status",
    details: lastError
  }, null, 2));
};
