module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const { title = 'Viru Beatz Track', style = 'EDM, Dance', voice = 'Collab', img = '' } = req.query;

  const bgImage = img || 'https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>
        <stop offset="50%" stop-color="#050811" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0.98"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.9"/>
      </filter>
    </defs>

    <!-- 16:9 Background Artwork -->
    <image href="${bgImage}" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" />

    <!-- Cinematic Gradient Overlay -->
    <rect width="1920" height="1080" fill="url(#bgGrad)" />

    <!-- Top Left Badge: POWERED BY VIRU BEATZ -->
    <g transform="translate(100, 90)">
      <rect width="420" height="60" rx="30" fill="#0284c7" fill-opacity="0.9" />
      <text x="210" y="38" font-family="'Segoe UI', Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">⚡ POWERED BY VIRU BEATZ</text>
    </g>

    <!-- Top Right: Vocal Mode Badge -->
    <g transform="translate(1520, 90)">
      <rect width="300" height="60" rx="30" fill="#1e293b" fill-opacity="0.9" stroke="#38bdf8" stroke-width="2"/>
      <text x="150" y="38" font-family="'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1.5">🎙 ${voice.toUpperCase()} VOCALS</text>
    </g>

    <!-- Visualizer EQ Bars -->
    <g transform="translate(100, 720)" fill="#38bdf8" opacity="0.75">
      <rect x="0" y="30" width="12" height="60" rx="6"/>
      <rect x="25" y="10" width="12" height="100" rx="6"/>
      <rect x="50" y="40" width="12" height="50" rx="6"/>
      <rect x="75" y="0" width="12" height="120" rx="6"/>
      <rect x="100" y="20" width="12" height="80" rx="6"/>
      <rect x="125" y="50" width="12" height="40" rx="6"/>
      <rect x="150" y="15" width="12" height="90" rx="6"/>
    </g>

    <!-- Main Song Title -->
    <text x="100" y="890" font-family="'Segoe UI', Arial, sans-serif" font-size="76" font-weight="900" fill="#ffffff" filter="url(#glow)">${title.substring(0, 32)}</text>
    
    <!-- Genre / Style Subtitle -->
    <text x="100" y="955" font-family="'Segoe UI', Arial, sans-serif" font-size="30" font-weight="600" fill="#38bdf8" letter-spacing="2">${style.substring(0, 45)}</text>
    
    <!-- Bottom Producer Bar -->
    <text x="100" y="1005" font-family="'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" fill="#94a3b8" letter-spacing="3">PRODUCED BY VIRUNA RANDINU • ARTIST: VIRU BEATZ • 2026</text>
  </svg>`;

  return res.status(200).send(svg);
};
