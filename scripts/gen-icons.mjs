/**
 * Generates the PWA icon set procedurally — no binary assets in the repo and
 * no image tooling to install. Run with `npm run icons`.
 *
 * يرسم شعار اللعبة: معيّن نيوني يتدرّج من الأحمر إلى الأزرق، بقلب بنفسجي
 * يرمز إلى «التحوّل»، فوق خلفية فاتحة مطابقة لخلفية التطبيق.
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// ---------------------------------------------------------------------------
// Minimal PNG encoder (8-bit RGBA, no interlacing)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  const crcInput = Buffer.concat([Buffer.from(type, 'ascii'), data])
  out.writeUInt32BE(crc32(crcInput), data.length + 8)
  return out
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// The mark
// ---------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

// تطابق رموز الثيم في globals.css
const RED = [244, 63, 94] // flame
const BLUE = [14, 165, 233] // aqua
const VIOLET = [168, 85, 247] // magic
const BG = [248, 250, 255] // canvas

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/**
 * @param {number} size    pixel dimensions (square)
 * @param {number} scale   mark size relative to the canvas; <1 leaves the
 *                         safe-zone padding Android maskable icons require
 */
function render(size, scale) {
  const px = Buffer.alloc(size * size * 4)
  // 2x2 supersampling keeps the diamond edges clean at 192px.
  const SS = 2

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const nx = (((x + (sx + 0.5) / SS) / size) * 2 - 1) / scale
          const ny = (((y + (sy + 0.5) / SS) / size) * 2 - 1) / scale

          let color = [...BG]

          // Corner glows.
          const dRed = Math.hypot(nx + 0.62, ny + 0.62)
          const dBlue = Math.hypot(nx - 0.62, ny - 0.62)
          color = mix(color, RED, 0.5 * Math.exp(-dRed * dRed * 2.1))
          color = mix(color, BLUE, 0.5 * Math.exp(-dBlue * dBlue * 2.1))

          // Diamond ring: |x| + |y| = const.
          const d = Math.abs(nx) + Math.abs(ny)
          const ring =
            smoothstep(0.5, 0.58, d) * (1 - smoothstep(0.76, 0.84, d))
          if (ring > 0) {
            const t = clamp01((nx - ny + 1.4) / 2.8)
            color = mix(color, mix(RED, BLUE, t), ring)
          }

          // Violet core — the Shift.
          const core = 1 - smoothstep(0.0, 0.3, d)
          color = mix(color, VIOLET, core * 0.9)

          r += color[0]
          g += color[1]
          b += color[2]
        }
      }

      const n = SS * SS
      const i = (y * size + x) * 4
      px[i] = Math.round(clamp01(r / n / 255) * 255)
      px[i + 1] = Math.round(clamp01(g / n / 255) * 255)
      px[i + 2] = Math.round(clamp01(b / n / 255) * 255)
      px[i + 3] = 255
    }
  }

  return encodePng(size, size, px)
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['icon-192.png', 192, 1.0],
  ['icon-512.png', 512, 1.0],
  // Maskable icons get cropped to a circle; shrink the mark into the safe zone.
  ['maskable-512.png', 512, 0.72],
  ['icon-32.png', 32, 1.0],
]

for (const [name, size, scale] of targets) {
  writeFileSync(join(OUT_DIR, name), render(size, scale))
  console.log(`wrote public/icons/${name}  (${size}x${size})`)
}
