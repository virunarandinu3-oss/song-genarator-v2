module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const { title = 'Viru Beatz Track', style = 'EDM, Dance', voice = 'Collab', img = '' } = req.query;

  const bgImage = img || 'https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%" style="max-width: 1280px; max-height: 720px; aspect-ratio: 16/9; display: block; margin: auto;">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.3"/>
        <stop offset="60%" stop-color="#050811" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0.98"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.9"/>
      </filter>
    </defs>

    <!-- 16:9 Background Artwork -->
    <image href="${bgImage}" width="1280" height="720" preserveAspectRatio="xMidYMid slice" />

    <!-- Gradient Overlay -->
    <rect width="1280" height="720" fill="url(#bgGrad)" />

    <!-- Top Left Badge: POWERED BY VIRU BEATZ™ -->
    <g transform="translate(60, 50)">
      <rect width="340" height="46" rx="23" fill="#0284c7" fill-opacity="0.9" />
      <text x="170" y="29" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">⚡ POWERED BY VIRU BEATZ™</text>
    </g>

    <!-- Top Right: Vocal Mode Badge -->
    <g transform="translate(960, 50)">
      <rect width="260" height="46" rx="23" fill="#1e293b" fill-opacity="0.9" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="130" y="29" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">🎙 ${voice.toUpperCase()} VOCALS</text>
    </g>

    <!-- EQ Visualizer Bars -->
    <g transform="translate(60, 470)" fill="#38bdf8" opacity="0.8">
      <rect x="0" y="20" width="8" height="40" rx="4"/>
      <rect x="16" y="5" width="8" height="70" rx="4"/>
      <rect x="32" y="25" width="8" height="35" rx="4"/>
      <rect x="48" y="0" width="8" height="85" rx="4"/>
      <rect x="64" y="15" width="8" height="55" rx="4"/>
      <rect x="80" y="30" width="8" height="25" rx="4"/>
    </g>

    <!-- Song Title -->
    <text x="60" y="585" font-family="'Segoe UI', Arial, sans-serif" font-size="52" font-weight="900" fill="#ffffff" filter="url(#glow)">${title.substring(0, 30)}</text>
    
    <!-- Genre / Style -->
    <text x="60" y="630" font-family="'Segoe UI', Arial, sans-serif" font-size="22" font-weight="600" fill="#38bdf8" letter-spacing="1.5">${style.substring(0, 40)}</text>
    
    <!-- Producer Tagline with TM -->
    <text x="60" y="670" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="800" fill="#94a3b8" letter-spacing="2">API CREATED BY VIRUNA RANDINU™ • POWERED BY VIRU BEATZ™ • 2026</text>
  </svg>`;

  return res.status(200).send(svg);
};
