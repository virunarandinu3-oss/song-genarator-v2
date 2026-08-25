const axios = require('axios');

const REMUSIC_BASE = 'https://remusic.ai';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { song_id } = req.query;

  if (!song_id) {
    return res.status(400).json({ error: "Parameter 'song_id' is required" });
  }

  const headers = {
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'origin': REMUSIC_BASE,
    'referer': `${REMUSIC_BASE}/ai-music-generator`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
  };

  // Status ලබාගත හැකි විභව Endpoints
  const candidateRequests = [
    () => axios.get(`${REMUSIC_BASE}/api/v1/ai-music/music/${song_id}`, { headers }),
    () => axios.post(`${REMUSIC_BASE}/api/v1/ai-music/music/detail`, { song_id: song_id }, { headers }),
    () => axios.get(`${REMUSIC_BASE}/api/v1/ai-music/song?song_id=${song_id}`, { headers }),
    () => axios.post(`${REMUSIC_BASE}/api/v1/ai-music/task`, { song_id: song_id }, { headers })
  ];

  let songData = null;
  let lastError = null;

  for (const sendReq of candidateRequests) {
    try {
      const resp = await sendReq();
      if (resp.data && (resp.data.data || resp.data.code === 100000)) {
        songData = resp.data.data?.[0] || resp.data.data || resp.data;
        break;
      }
    } catch (err) {
      lastError = err.response ? err.response.data : err.message;
    }
  }

  if (songData) {
    const audioUrl = songData.audio_url || songData.url || '';
    const isCompleted = songData.status === 'complete' || songData.status === 'completed' || !!audioUrl;

    return res.status(200).json({
      success: true,
      song_id: song_id,
      status: isCompleted ? "complete" : (songData.status || "pending"),
      percentage: songData.percentage || (isCompleted ? 100 : 50),
      title: songData.title || "Viru Beatz Track",
      audio_url: audioUrl,
      lyrics: songData.lyrics || "",
      download_mp3: audioUrl ? `https://${req.headers.host}/api/download?audio_url=${encodeURIComponent(audioUrl)}&song_title=${encodeURIComponent(songData.title || 'Viru Beatz Track')}` : null
    });
  }

  return res.status(500).json({
    success: false,
    error: "Could not fetch song status",
    details: lastError
  });
};
