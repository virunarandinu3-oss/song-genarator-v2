const axios = require('axios');

const REMUSIC_BASE = 'https://remusic.ai';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { song_id, token = process.env.REMUSIC_TOKEN || '' } = req.query;

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
    const percentage = songData.percentage || (isComplete ? 100 : 50);
    const title = songData.title || "Viru Beatz Track";

    const cleanStatusOutput = {
      status: isComplete ? "complete" : (songData.status || "rendering"),
      percentage: `${percentage}%`,
      stream_link: audioUrl || null,
      download_link: audioUrl ? `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}` : null
    };

    return res.status(200).send(JSON.stringify(cleanStatusOutput, null, 2));
  }

  return res.status(500).send(JSON.stringify({
    error: "Could not fetch status",
    details: lastError
  }, null, 2));
};
