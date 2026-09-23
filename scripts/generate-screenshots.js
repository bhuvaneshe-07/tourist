import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

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
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelShader(x, y, width, height);
      const px = rowOffset + 1 + x * 4;
      raw[px] = Math.max(0, Math.min(255, Math.round(r)));
      raw[px + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[px + 2] = Math.max(0, Math.min(255, Math.round(b)));
      raw[px + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  const deflated = zlib.deflateSync(raw, { level: 6 });
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
  ihdr[8] = 8;
  ihdr[9] = 6;
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

// Generate desktop screenshot (1280x720) with brand styling
const desktopPNG = createPNG(1280, 720, (x, y, w, h) => {
  // Top nav bar
  if (y < 64) {
    return [15, 118, 110, 255]; // #0f766e
  }
  // Hero section
  if (y < 280) {
    const t = (y - 64) / (280 - 64);
    const r = 240 + Math.floor(t * 10);
    const g = 245 + Math.floor(t * 5);
    const b = 250;
    return [r, g, b, 255];
  }
  // Cards area (light background)
  const isCardY = y > 320 && y < 650;
  const card1 = x > 100 && x < 420;
  const card2 = x > 480 && x < 800;
  const card3 = x > 860 && x < 1180;
  if (isCardY && (card1 || card2 || card3)) {
    // Card header photo
    if (y < 460) {
      if (card1) return [14, 165, 233, 255]; // Sky blue
      if (card2) return [245, 158, 11, 255]; // Amber
      return [16, 185, 129, 255]; // Emerald
    }
    return [255, 255, 255, 255];
  }
  return [248, 250, 252, 255]; // #f8fafc slate-50
});

// Generate mobile screenshot (540x960)
const mobilePNG = createPNG(540, 960, (x, y, w, h) => {
  // Top header
  if (y < 56) {
    return [15, 118, 110, 255];
  }
  // Card 1
  if (y > 90 && y < 380 && x > 40 && x < 500) {
    if (y < 240) return [14, 165, 233, 255];
    return [255, 255, 255, 255];
  }
  // Card 2
  if (y > 410 && y < 700 && x > 40 && x < 500) {
    if (y < 560) return [245, 158, 11, 255];
    return [255, 255, 255, 255];
  }
  // Card 3
  if (y > 730 && y < 940 && x > 40 && x < 500) {
    return [16, 185, 129, 255];
  }
  return [248, 250, 252, 255];
});

fs.writeFileSync(path.join(process.cwd(), "screenshot-desktop.png"), desktopPNG);
fs.writeFileSync(path.join(process.cwd(), "static", "screenshot-desktop.png"), desktopPNG);
fs.writeFileSync(path.join(process.cwd(), "screenshot-mobile.png"), mobilePNG);
fs.writeFileSync(path.join(process.cwd(), "static", "screenshot-mobile.png"), mobilePNG);

console.log("Screenshots generated successfully!");
