module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const { title = 'Viru Beatz Track', img = '' } = req.query;

  const bgImage = img || 'https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp';

  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%" style="max-width: 1280px; aspect-ratio: 16/9; display: block; margin: auto;">
    <defs>
      <linearGradient id="bottomShadow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="40%" stop-color="#000000" stop-opacity="0.25"/>
        <stop offset="80%" stop-color="#000000" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.95"/>
      </linearGradient>

      <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.9"/>
      </filter>
    </defs>

    <!-- Crystal Clear Background Image (No Blur) -->
    <image href="${bgImage}" width="1280" height="720" preserveAspectRatio="xMidYMid slice" />

    <!-- Soft Bottom Shadow -->
    <rect y="380" width="1280" height="340" fill="url(#bottomShadow)" />

    <!-- Big Bold Song Title -->
    <text x="60" y="615" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="64" font-weight="900" fill="#ffffff" filter="url(#textShadow)">${cleanTitle.substring(0, 32)}</text>
    
    <!-- 2026 Tagline -->
    <text x="60" y="665" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="20" font-weight="800" fill="#38bdf8" letter-spacing="3" filter="url(#textShadow)">POWERED BY VIRU BEATZ 2026</text>
  </svg>`;

  return res.status(200).send(svg);
};
