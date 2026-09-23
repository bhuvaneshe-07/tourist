import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function createPNG(width, height, pixelShader) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelShader(x, y, width, height);
      const px = rowOffset + 1 + x * 4;
      raw[px] = Math.max(0, Math.min(255, Math.round(r)));
      raw[px + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[px + 2] = Math.max(0, Math.min(255, Math.round(b)));
      raw[px + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  const deflated = zlib.deflateSync(raw, { level: 9 });
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    pngSig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", deflated),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
}

/**
 * Procedural compass drawing shader
 * isMaskable: true -> full bleed background to edges, central artwork within 80% safe zone
 */
function compassShader(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = width / 2;

  // Background gradient: Teal-900 to Teal-700
  // (#0f766e to #134e4a)
  const gradT = (x + y) / (width + height);
  const bgR = 15 + gradT * 8;
  const bgG = 118 - gradT * 25;
  const bgB = 110 - gradT * 30;

  if (!isMaskable) {
    // Round icon with gentle anti-aliasing on outer boundary
    const cornerRadius = width * 0.22; // rounded square / app squircle
    // Compute distance to rounded rect
    const qx = Math.abs(dx) - (cx - cornerRadius);
    const qy = Math.abs(dy) - (cy - cornerRadius);
    const ax = Math.max(qx, 0);
    const ay = Math.max(qy, 0);
    const dCorner = Math.sqrt(ax * ax + ay * ay);
    const outsideDist = (qx > 0 || qy > 0) ? dCorner - cornerRadius : Math.max(qx, qy) - cornerRadius;

    if (outsideDist > 1.5) {
      return [0, 0, 0, 0]; // transparent
    }
  }

  // Base background
  let r = bgR;
  let g = bgG;
  let b = bgB;
  let a = 255;

  // Artwork scale: for maskable, fit inside safe circle (radius = 0.38 * width)
  const artworkScale = isMaskable ? 0.36 * width : 0.40 * width;

  // 1. Outer dial ring
  const ringR = artworkScale;
  const ringWidth = Math.max(2, width * 0.02);
  const ringDist = Math.abs(dist - ringR);
  if (ringDist < ringWidth) {
    const ringAlpha = Math.max(0, 1 - ringDist / ringWidth);
    // Light teal accent #5eead4
    r = r * (1 - ringAlpha) + 94 * ringAlpha;
    g = g * (1 - ringAlpha) + 234 * ringAlpha;
    b = b * (1 - ringAlpha) + 212 * ringAlpha;
  }

  // 2. Compass tick marks (every 45 degrees)
  if (dist > ringR - width * 0.05 && dist < ringR + width * 0.02) {
    const angle = Math.atan2(dy, dx);
    // Normalize to 8 sectors
    const sector = ((angle / (Math.PI / 4)) % 1 + 1) % 1;
    const tickDist = Math.min(sector, 1 - sector) * (Math.PI / 4) * dist;
    if (tickDist < width * 0.012) {
      r = 255;
      g = 255;
      b = 255;
    }
  }

  // 3. Inner globe grid circles
  const innerGlobeR = ringR * 0.65;
  const globeDist = Math.abs(dist - innerGlobeR);
  if (globeDist < width * 0.01) {
    const alpha = 0.4;
    r = r * (1 - alpha) + 204 * alpha;
    g = g * (1 - alpha) + 251 * alpha;
    b = b * (1 - alpha) + 241 * alpha;
  }

  // 4. 4-pointed primary compass star (North, South, East, West)
  // Distance to a 4-point star: |dx| + |dy| + weighting
  const needleLength = artworkScale * 0.88;
  const needleWidth = artworkScale * 0.22;

  // North needle (dy < 0, |dx| < needleWidth * (1 + dy/needleLength))
  if (dy < 0 && dy > -needleLength) {
    const t = -dy / needleLength;
    const allowedW = needleWidth * (1 - t);
    if (Math.abs(dx) <= allowedW) {
      // Right half bright white/teal, left half light cyan
      if (dx >= 0) {
        return [255, 255, 255, 255]; // Crisp white
      } else {
        return [204, 251, 241, 255]; // Soft teal-white #ccfbf1
      }
    }
  }

  // South needle (dy > 0)
  if (dy > 0 && dy < needleLength) {
    const t = dy / needleLength;
    const allowedW = needleWidth * (1 - t);
    if (Math.abs(dx) <= allowedW) {
      if (dx >= 0) {
        return [45, 212, 191, 255]; // Vibrant teal #2dd4bf
      } else {
        return [20, 184, 166, 255]; // Deep teal #14b8a6
      }
    }
  }

  // East needle (dx > 0)
  if (dx > 0 && dx < needleLength) {
    const t = dx / needleLength;
    const allowedW = needleWidth * (1 - t);
    if (Math.abs(dy) <= allowedW) {
      if (dy >= 0) {
        return [255, 255, 255, 255];
      } else {
        return [94, 234, 212, 255];
      }
    }
  }

  // West needle (dx < 0)
  if (dx < 0 && dx > -needleLength) {
    const t = -dx / needleLength;
    const allowedW = needleWidth * (1 - t);
    if (Math.abs(dy) <= allowedW) {
      if (dy >= 0) {
        return [20, 184, 166, 255];
      } else {
        return [13, 148, 136, 255];
      }
    }
  }

  // 5. Center pivot hub
  const hubR = width * 0.055;
  if (dist <= hubR) {
    // Gold/amber center jewel for high visual distinction
    const hubDist = dist / hubR;
    if (hubDist < 0.5) {
      return [255, 255, 255, 255];
    } else {
      return [251, 191, 36, 255]; // Amber #fbbf24
    }
  }

  return [r, g, b, a];
}

console.log("Generating PWA Icon Assets...");

const targets = [
  { file: "pwa-192x192.png", size: 192, maskable: false },
  { file: "pwa-512x512.png", size: 512, maskable: false },
  { file: "pwa-maskable-512x512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true }, // iOS requires solid background
  { file: "favicon.png", size: 32, maskable: false }
];

const destDirs = [
  path.resolve("."),
  path.resolve("static")
];

targets.forEach(({ file, size, maskable }) => {
  const buf = createPNG(size, size, (x, y, w, h) => compassShader(x, y, w, h, maskable));
  destDirs.forEach(dir => {
    const p = path.join(dir, file);
    fs.writeFileSync(p, buf);
    console.log(`Saved ${p} (${size}x${size}, ${buf.length} bytes)`);
  });
});

// Also create vector icon.svg
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#115e59" />
    </linearGradient>
    <linearGradient id="needle-n-r" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f0fdfa" />
    </linearGradient>
    <linearGradient id="needle-n-l" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ccfbf1" />
      <stop offset="100%" stop-color="#99f6e4" />
    </linearGradient>
    <linearGradient id="needle-s-r" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <linearGradient id="needle-s-l" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Background squircle -->
  <rect x="16" y="16" width="480" height="480" rx="110" fill="url(#bg-grad)" filter="url(#drop-shadow)" />
  
  <!-- Outer Compass Ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#5eead4" stroke-width="8" opacity="0.85" />
  <circle cx="256" cy="256" r="140" fill="none" stroke="#ccfbf1" stroke-width="2" stroke-dasharray="8 6" opacity="0.5" />

  <!-- Cardinal Ticks -->
  <line x1="256" y1="60" x2="256" y2="82" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
  <line x1="256" y1="430" x2="256" y2="452" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
  <line x1="60" y1="256" x2="82" y2="256" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
  <line x1="430" y1="256" x2="452" y2="256" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />

  <!-- North Needle -->
  <polygon points="256,76 256,256 298,256" fill="url(#needle-n-r)" />
  <polygon points="256,76 214,256 256,256" fill="url(#needle-n-l)" />

  <!-- South Needle -->
  <polygon points="256,436 298,256 256,256" fill="url(#needle-s-r)" />
  <polygon points="256,436 256,256 214,256" fill="url(#needle-s-l)" />

  <!-- East Needle -->
  <polygon points="436,256 256,214 256,256" fill="url(#needle-n-r)" />
  <polygon points="436,256 256,256 256,298" fill="url(#needle-s-r)" />

  <!-- West Needle -->
  <polygon points="76,256 256,256 256,214" fill="url(#needle-n-l)" />
  <polygon points="76,256 256,298 256,256" fill="url(#needle-s-l)" />

  <!-- Center Pivot Hub -->
  <circle cx="256" cy="256" r="28" fill="#fbbf24" stroke="#ffffff" stroke-width="4" />
  <circle cx="256" cy="256" r="10" fill="#ffffff" />
</svg>
`;

destDirs.forEach(dir => {
  const p = path.join(dir, "icon.svg");
  fs.writeFileSync(p, svgContent, "utf8");
  console.log(`Saved ${p}`);
});

console.log("All PWA icons successfully generated.");
