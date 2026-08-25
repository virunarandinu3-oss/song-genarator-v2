module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const { title = 'Viru Beatz Track', style = 'Electronic, Pop', img = '' } = req.query;

  const bgImage = img || 'https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.3"/>
        <stop offset="60%" stop-color="#000000" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#050811" stop-opacity="0.95"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.8"/>
      </filter>
    </defs>

    <!-- Background Artwork -->
    <image href="${bgImage}" width="800" height="800" preserveAspectRatio="xMidYMid slice" />

    <!-- Dark Gradient Overlay -->
    <rect width="800" height="800" fill="url(#grad)" />

    <!-- Top Badge: Powered by Viru Beatz -->
    <g transform="translate(40, 50)">
      <rect width="320" height="42" rx="21" fill="#0284c7" fill-opacity="0.85" />
      <text x="160" y="27" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">⚡ POWERED BY VIRU BEATZ</text>
    </g>

    <!-- Center Waveform Decors -->
    <g transform="translate(40, 580)" fill="#38bdf8" opacity="0.6">
      <rect x="0" y="20" width="8" height="40" rx="4"/>
      <rect x="18" y="5" width="8" height="70" rx="4"/>
      <rect x="36" y="25" width="8" height="35" rx="4"/>
      <rect x="54" y="0" width="8" height="85" rx="4"/>
      <rect x="72" y="15" width="8" height="55" rx="4"/>
      <rect x="90" y="30" width="8" height="25" rx="4"/>
    </g>

    <!-- Bottom Content: Song Title & Producer Info -->
    <text x="40" y="690" font-family="'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#ffffff" filter="url(#shadow)">${title.substring(0, 24)}</text>
    
    <text x="40" y="730" font-family="'Segoe UI', Arial, sans-serif" font-size="20" font-weight="600" fill="#38bdf8" letter-spacing="1">${style.substring(0, 35)}</text>
    
    <text x="40" y="765" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="700" fill="#94a3b8" letter-spacing="2">PRODUCED BY VIRUNA RANDINU • 2026</text>
  </svg>`;

  return res.status(200).send(svg);
};
