module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const { title = 'Viru Beatz Track', style = 'EDM, Dance', voice = 'Collab', img = '' } = req.query;

  const bgImage = img || 'https://cdn.remusic.ai/remusic/presets/music/image/88ca39aa88330d58954236fe89979125.webp';

  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanStyle = style.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%" style="max-width: 1280px; aspect-ratio: 16/9; display: block; margin: auto; background: #030712;">
    <defs>
      <!-- Premium Dark Cyberpunk Gradients -->
      <linearGradient id="overlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#020617" stop-opacity="0.4"/>
        <stop offset="50%" stop-color="#090d16" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="#030712" stop-opacity="0.98"/>
      </linearGradient>
      
      <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00f0ff"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>

      <linearGradient id="neonPurple" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>

      <!-- Glow Filters -->
      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.95"/>
      </filter>

      <!-- Dot Pattern for Tech Aesthetic -->
      <pattern id="gridDots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="#38bdf8" fill-opacity="0.15"/>
      </pattern>
    </defs>

    <!-- 1. Background Artwork Image -->
    <image href="${bgImage}" width="1280" height="720" preserveAspectRatio="xMidYMid slice" />

    <!-- 2. Dark Overlay & Cyberpunk Grid -->
    <rect width="1280" height="720" fill="url(#overlayGrad)" />
    <rect width="1280" height="720" fill="url(#gridDots)" />

    <!-- 3. Glassmorphism Top Badges -->
    <!-- Brand Badge: VIRU Beatz -->
    <g transform="translate(60, 45)">
      <rect width="260" height="44" rx="22" fill="#0369a1" fill-opacity="0.4" stroke="#00f0ff" stroke-width="1.5" filter="url(#neonGlow)"/>
      <circle cx="25" cy="22" r="6" fill="#00f0ff"/>
      <text x="145" y="28" font-family="'Segoe UI', 'SF Pro Display', Arial, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">⚡ VIRU BEATZ</text>
    </g>

    <!-- Vocal Mode Badge -->
    <g transform="translate(980, 45)">
      <rect width="240" height="44" rx="22" fill="#1e1b4b" fill-opacity="0.5" stroke="#a855f7" stroke-width="1.5"/>
      <text x="120" y="28" font-family="'Segoe UI', 'SF Pro Display', Arial, sans-serif" font-size="14" font-weight="800" fill="#f3e8ff" text-anchor="middle" letter-spacing="1.5">🎙 ${voice.toUpperCase()} VOCALS</text>
    </g>

    <!-- 4. Equalizer / Visualizer Spectrum (Studio Glass Effect) -->
    <g transform="translate(60, 475)" filter="url(#neonGlow)">
      <rect x="0" y="25" width="7" height="45" rx="3.5" fill="url(#neonCyan)"/>
      <rect x="14" y="10" width="7" height="60" rx="3.5" fill="url(#neonCyan)"/>
      <rect x="28" y="30" width="7" height="40" rx="3.5" fill="url(#neonCyan)"/>
      <rect x="42" y="5" width="7" height="65" rx="3.5" fill="url(#neonPurple)"/>
      <rect x="56" y="18" width="7" height="52" rx="3.5" fill="url(#neonPurple)"/>
      <rect x="70" y="35" width="7" height="35" rx="3.5" fill="url(#neonCyan)"/>
      <rect x="84" y="8" width="7" height="62" rx="3.5" fill="url(#neonCyan)"/>
      <rect x="98" y="22" width="7" height="48" rx="3.5" fill="url(#neonPurple)"/>
      <rect x="112" y="40" width="7" height="30" rx="3.5" fill="url(#neonPurple)"/>
    </g>

    <!-- 5. Modern Typography Content -->
    <!-- Main Song Title -->
    <text x="60" y="585" font-family="'Segoe UI', 'SF Pro Display', Arial, sans-serif" font-size="54" font-weight="900" fill="#ffffff" filter="url(#textGlow)" letter-spacing="0.5">${cleanTitle.substring(0, 32)}</text>
    
    <!-- Genre & Audio Spec Tagline -->
    <text x="60" y="630" font-family="'Segoe UI', 'SF Pro Display', Arial, sans-serif" font-size="20" font-weight="700" fill="#00f0ff" letter-spacing="2">${cleanStyle.toUpperCase().substring(0, 45)} • HI-RES AUDIO</text>
    
    <!-- Clean Footer -->
    <g transform="translate(60, 672)">
      <line x1="0" y1="0" x2="1160" y2="0" stroke="#334155" stroke-width="1" stroke-opacity="0.5"/>
      <text x="0" y="22" font-family="'Segoe UI', 'SF Pro Display', Arial, sans-serif" font-size="14" font-weight="700" fill="#94a3b8" letter-spacing="2.5">API CREATED BY <tspan fill="#ffffff">VIRUNA RANDINU</tspan> • POWERED BY <tspan fill="#00f0ff">VIRU BEATZ</tspan> • 2026</text>
    </g>
  </svg>`;

  return res.status(200).send(svg);
};
