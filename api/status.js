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
    // 50% Reset වීම වැළැක්වීමට නිවැරදි Detail Endpoint එක පමණක් Call කිරීම
    const response = await axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music/detail`, { song_id: song_id }, { headers, timeout: 15000 });

    const songData = response.data?.data?.[0] || response.data?.data || response.data || {};
    const audioUrl = songData.audio_url || songData.url || '';
    const isComplete = songData.status === 'complete' || songData.status === 'completed' || (audioUrl && audioUrl.startsWith('http'));
    const title = songData.title || "Viru Beatz Track";

    // 1. ගීතය සෑදී අවසන් නම් -> 100% Complete
    if (isComplete && audioUrl) {
      return res.status(200).send(JSON.stringify({
        api_created_by: "VIRUNA RANDINU™",
        powered_by: "VIRU BEATZ™",
        status: "complete",
        percentage: "100%",
        stream_link: audioUrl,
        download_link: `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(title)}`
      }, null, 2));
    }

    // 2. තවමත් Render වෙමින් පවතී නම්
    const rawPercentage = Number(songData.percentage) || 0;
    const displayPercentage = rawPercentage > 0 ? `${rawPercentage}%` : "45%";

    return res.status(200).send(JSON.stringify({
      api_created_by: "VIRUNA RANDINU™",
      powered_by: "VIRU BEATZ™",
      status: "rendering",
      percentage: displayPercentage,
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
