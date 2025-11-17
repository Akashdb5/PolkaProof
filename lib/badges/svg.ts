export function buildDefaultBadgeSvg(participant: string, event: string) {
  const safeParticipant = participant.slice(0, 32);
  const safeEvent = event.slice(0, 48);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="32" fill="url(#grad)"/>
  <circle cx="200" cy="150" r="70" fill="rgba(255,255,255,0.15)"/>
  <circle cx="200" cy="150" r="40" fill="rgba(255,255,255,0.5)"/>
  <text x="200" y="255" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="20">
    ${safeParticipant}
  </text>
  <text x="200" y="290" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="16">
    ${safeEvent}
  </text>
  <text x="200" y="330" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="12">
    Proof of Attendance
  </text>
</svg>`;
}

export function svgToBuffer(svg: string) {
  return Buffer.from(svg, "utf-8");
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
