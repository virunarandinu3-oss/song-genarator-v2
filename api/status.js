const axios = require('axios');

const REMUSIC_BASE = 'https://remusic.ai';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { song_id } = req.query;

  if (!song_id) {
    return res.status(400).json({ error: "Parameter 'song_id' is required" });
  }

  try {
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'origin': REMUSIC_BASE,
      'referer': `${REMUSIC_BASE}/ai-music-generator`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
    };

    const response = await axios.get(`${REMUSIC_BASE}/api/v1/ai-music/music?song_id=${song_id}`, {
      headers: headers,
      timeout: 30000
    });

    const data = response.data?.data?.[0] || response.data?.data || response.data || {};
    const audioUrl = data.audio_url || data.url || '';
    const isCompleted = data.status === 'complete' || data.status === 'completed' || !!audioUrl;

    return res.status(200).json({
      success: true,
      song_id: song_id,
      status: isCompleted ? "complete" : (data.status || "pending"),
      title: data.title || "Viru Beatz Track",
      audio_url: audioUrl,
      lyrics: data.lyrics || "",
      download_mp3: audioUrl ? `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(data.title || 'Viru Beatz Track')}` : null
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to check status",
      details: error.response ? error.response.data : error.message
    });
  }
};
