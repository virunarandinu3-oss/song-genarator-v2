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

  try {
    // 1. Task Detail Endpoint
    const response = await axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music/detail`, { song_id: song_id }, { headers, timeout: 15000 });

    const songData = response.data?.data?.[0] || response.data?.data || response.data || {};
    const audioUrl = songData.audio_url || songData.url || songData.audio || '';
    const isComplete = songData.status === 'complete' || songData.status === 'completed' || songData.status === 'success' || (typeof audioUrl === 'string' && audioUrl.startsWith('http'));
    const title = songData.title || "VIRU Beatz Track";

    // 2. ගීතය සෑදී අවසන් නම් -> ස්ථිරවම 100% Complete
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

    // 3. තවමත් Render වෙමින් පවතී නම් (Dynamic Progressive Percentage - Never stuck at 45%)
    let progressVal = Number(songData.percentage) || 0;
    if (progressVal <= 0 && songData.create_time) {
      const elapsed = Math.floor(Date.now() / 1000) - Number(songData.create_time);
      progressVal = Math.min(95, Math.max(10, Math.floor((elapsed / 35) * 100)));
    } else if (progressVal <= 0) {
      progressVal = 40;
    }

    return res.status(200).send(JSON.stringify({
      api_created_by: "Viruna Randinu",
      powered_by: "VIRU Beatz",
      status: "rendering",
      percentage: `${progressVal}%`,
      stream_link: null,
      download_link: null
    }, null, 2));

  } catch (err) {
    return res.status(500).send(JSON.stringify({
      error: "Could not fetch status",
      details: err.response ? err.response.data : err.message
    }, null, 2));
  }
};
