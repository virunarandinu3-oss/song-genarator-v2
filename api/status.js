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
    () => axios.get(`${REMUSIC_BASE}/api/v1/ai-music/music/${song_id}`, { headers, timeout: 10000 }),
    () => axios.get(`${REMUSIC_BASE}/api/v1/ai-music/song?song_id=${song_id}`, { headers, timeout: 10000 })
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
    const audioUrl = songData.audio_url || songData.url || songData.audio || songData.music_url || '';
    const isComplete = songData.status === 'complete' || songData.status === 'completed' || songData.status === 'success' || (typeof audioUrl === 'string' && audioUrl.startsWith('http'));
    const title = songData.title || "VIRU Beatz Track";

    if (isComplete && audioUrl) {
      return res.status(200).send(JSON.stringify({
        api_created_by: "Viruna Randinu",
        powered_by: "VIRU Beatz",
        status: "complete",
        percentage: "100%",
        stream_link: audioUrl,
        download_link: `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}`
      }, null, 2));
    }

    const remusicPercentage = Number(songData.percentage) || 0;
    const displayPercentage = remusicPercentage > 0 ? `${remusicPercentage}%` : "50%";

    return res.status(200).send(JSON.stringify({
      api_created_by: "Viruna Randinu",
      powered_by: "VIRU Beatz",
      status: "rendering",
      percentage: displayPercentage,
      stream_link: null,
      download_link: null
    }, null, 2));
  }

  return res.status(500).send(JSON.stringify({
    error: "Could not fetch status",
    details: lastError
  }, null, 2));
};
