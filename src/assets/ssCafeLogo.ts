/**
 * Official SS Café and Restaurant High-Resolution Vector Brand Logo
 * Rendered as an optimized inline SVG Data URL for 100% reliable 0ms rendering across all devices & canvases.
 */

export const SS_CAFE_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF3B0" />
      <stop offset="30%" stop-color="#E5A93C" />
      <stop offset="70%" stop-color="#9E5B0E" />
      <stop offset="100%" stop-color="#592E03" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2D1102" />
      <stop offset="50%" stop-color="#140600" />
      <stop offset="100%" stop-color="#3D1804" />
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Ornate Royal Outer Border -->
  <rect x="15" y="15" width="370" height="370" rx="45" fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="8" />
  <rect x="25" y="25" width="350" height="350" rx="38" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="6,4" />

  <!-- Ornate Corner Filigrees -->
  <path d="M 45 65 C 45 45, 65 45, 65 45 C 55 55, 55 65, 45 65 Z" fill="url(#goldGrad)" />
  <path d="M 355 65 C 355 45, 335 45, 335 45 C 345 55, 345 65, 355 65 Z" fill="url(#goldGrad)" />
  <path d="M 45 335 C 45 355, 65 355, 65 355 C 55 345, 55 335, 45 335 Z" fill="url(#goldGrad)" />
  <path d="M 355 335 C 355 355, 335 355, 335 355 C 345 345, 345 335, 355 335 Z" fill="url(#goldGrad)" />

  <!-- Central Crest Arch -->
  <path d="M 120 70 C 200 40, 200 40, 280 70 C 330 110, 330 250, 280 300 C 200 340, 200 340, 120 300 C 70 250, 70 110, 120 70 Z" fill="#1A0700" stroke="url(#goldGrad)" stroke-width="4" filter="url(#goldGlow)" />

  <!-- Iconic Monogram "SS" -->
  <!-- First 'S' -->
  <path d="M 180 120 C 140 115, 110 135, 110 165 C 110 200, 190 190, 190 225 C 190 255, 150 260, 120 245 L 115 270 C 150 285, 215 280, 215 225 C 215 185, 135 195, 135 165 C 135 145, 160 140, 185 145 Z" fill="url(#goldGrad)" />
  
  <!-- Second 'S' (Interlocking) -->
  <path d="M 260 120 C 220 115, 190 135, 190 165 C 190 200, 270 190, 270 225 C 270 255, 230 260, 200 245 L 195 270 C 230 285, 295 280, 295 225 C 295 185, 215 195, 215 165 C 215 145, 240 140, 265 145 Z" fill="url(#goldGrad)" opacity="0.95" />

  <!-- Teapot / Coffee Cup Silhouette at bottom center -->
  <path d="M 175 305 L 225 305 C 220 325, 180 325, 175 305 Z" fill="url(#goldGrad)" />
  <circle cx="200" cy="298" r="3" fill="#FFE57F" />
  
  <!-- Banner Ribbon at Bottom -->
  <rect x="50" y="340" width="300" height="35" rx="8" fill="url(#goldGrad)" stroke="#FFE57F" stroke-width="1.5" />
  <text x="200" y="364" font-family="Arial, sans-serif" font-size="19" font-weight="900" fill="#2E0E00" text-anchor="middle" letter-spacing="1.5">SS CAFÉ &amp; RESTAURANT</text>
</svg>
`)}`;
