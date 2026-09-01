// gen-icons.mjs — генерация иконок PWA 192/512 (§15) без зависимостей.
// Простая геометрия: тёмный фон, кольцо-компас (акцент), игла (бирюза).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PUBLIC = path.join(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'public');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(size) {
  const W = size, H = size;
  // RGBA
  const raw = Buffer.alloc((W * 4 + 1) * H);
  const cx = W / 2, cy = H / 2;
  const R = W * 0.46;              // радиус скругления-круга фона
  const ring = W * 0.30;           // радиус кольца
  const ringW = W * 0.045;         // толщина кольца
  const needle = W * 0.20;         // длина иглы

  const px = (x, y, r, g, b, a = 255) => {
    const o = (y * W + x) * 4 + 1;
    raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
  };
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // фильтр None
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) continue; // прозрачные углы (круглый «контейнер»)
      // фон
      let r = 0x0d, g = 0x10, b = 0x22;
      // кольцо
      if (Math.abs(d - ring) < ringW) { r = 0x6c; g = 0x5c; b = 0xe7; }
      // игла компаса (стрелка на северо-восток)
      // линия от центра под 45°
      const proj = (dx * 0.7071 + dy * 0.7071);          // вдоль оси иглы
      const perp = Math.abs(-dx * 0.7071 + dy * 0.7071); // поперёк
      if (perp < ringW * 0.7 && proj > -needle && proj < needle && Math.abs(d - ring) >= ringW) {
        if (proj > 0) { r = 0x00; g = 0xce; b = 0xc9; }  // северная половина — бирюза
        else { r = 0xe8; g = 0xea; b = 0xf2; }           // южная — светлая
      }
      px(x, y, r, g, b);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of [192, 512]) {
  const f = path.join(PUBLIC, `icon-${size}.png`);
  fs.writeFileSync(f, png(size));
  console.log(`${path.basename(f)}: ${(fs.statSync(f).size / 1024).toFixed(1)} КБ`);
}
