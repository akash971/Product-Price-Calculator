const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function createPng(width, height, colorFn) {
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = colorFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth: 8
  ihdr[9] = 6; // color type: RGBA (6)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function colorApp(x, y, w, h) {
  // rounded squircle corner mask
  const rad = w * 0.22;
  const cx = x < rad ? rad : (x > w - rad ? w - rad : x);
  const cy = y < rad ? rad : (y > h - rad ? h - rad : y);
  const dist = Math.hypot(x - cx, y - cy);
  if (dist > rad) return [0, 0, 0, 0];

  // Deep obsidian/slate background with subtle emerald gradient
  const t = (x + y) / (w + h);
  let r = Math.round(11 + 5 * t);
  let g = Math.round(17 + 80 * t);
  let b = Math.round(30 + 30 * t);

  // Border glow
  if (dist > rad - 4 || x < 4 || x > w - 4 || y < 4 || y > h - 4) {
    return [16, 185, 129, 255];
  }

  // Draw cargo parcel in center
  const mx = w / 2;
  const my = h / 2;
  const dx = Math.abs(x - mx);
  const dy = Math.abs(y - my);
  if (dx < w * 0.24 && dy < h * 0.24) {
    return [16, 185, 129, 255];
  }

  return [r, g, b, 255];
}

const dir = path.join(__dirname, 'icons');
fs.writeFileSync(path.join(dir, 'icon-192.png'), createPng(192, 192, colorApp));
fs.writeFileSync(path.join(dir, 'icon-512.png'), createPng(512, 512, colorApp));
console.log('Successfully generated icons/icon-192.png and icons/icon-512.png!');
