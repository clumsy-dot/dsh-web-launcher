// 把 assets/whale.png 做成 macOS 应用图标：白色圆角底板 + 居中鲸鱼
// 纯 Node 实现（PNG 解码/编码都自己来），不依赖任何图形库。
// 用法：node tools/make-icon.mjs [输入 png] [输出 png]
import { inflateSync, deflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SRC = resolve(process.argv[2] ?? new URL('../assets/whale.png', import.meta.url).pathname)
const OUT = resolve(process.argv[3] ?? new URL('../assets/icon.png', import.meta.url).pathname)
const SIZE = 1024        // 画布
const TILE = 824         // 图标主体：Apple 的 macOS 图标网格（1024 画布内 824×824 居中）
const RADIUS = 186       // 824 × 22.6%

// ------------------------------------------------------------------ 解码 ---
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG 文件')
  let pos = 8
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0
  const idat = []
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  if (depth !== 8) throw new Error(`只支持 8 位深，收到 ${depth}`)
  if (interlace !== 0) throw new Error('不支持隔行 PNG')
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`不支持的颜色类型 ${colorType}`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const px = Buffer.alloc(stride * height)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = px.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null
    for (let i = 0; i < stride; i++) {
      const x = line[i]
      const a = i >= channels ? out[i - channels] : 0
      const b = prev ? prev[i] : 0
      const c = prev && i >= channels ? prev[i - channels] : 0
      let v
      switch (filter) {
        case 0: v = x; break
        case 1: v = x + a; break
        case 2: v = x + b; break
        case 3: v = x + ((a + b) >> 1); break
        case 4: v = x + paeth(a, b, c); break
        default: throw new Error(`未知过滤器 ${filter}`)
      }
      out[i] = v & 0xff
    }
  }
  return { width, height, channels, px }
}

// ------------------------------------------------------------------ 合成 ---
const src = decodePng(readFileSync(SRC))
const INSET = (SIZE - TILE) / 2
const scale = TILE / Math.max(src.width, src.height)
const offX = INSET + (TILE - src.width * scale) / 2
const offY = INSET + (TILE - src.height * scale) / 2

const out = Buffer.alloc(SIZE * SIZE * 4)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // 圆角底板覆盖率（边缘 1px 抗锯齿）
    const cx = x + 0.5 - SIZE / 2
    const cy = y + 0.5 - SIZE / 2
    const qx = Math.abs(cx) - TILE / 2 + RADIUS
    const qy = Math.abs(cy) - TILE / 2 + RADIUS
    const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - RADIUS
    const cover = clamp(0.5 - sdf, 0, 1)
    if (cover <= 0) continue

    // 采样源图（最近邻 + 双线性，够用）
    const sx = (x + 0.5 - offX) / scale - 0.5
    const sy = (y + 0.5 - offY) / scale - 0.5
    let r = 255, g = 255, b = 255 // 底板是白色
    if (sx >= -1 && sy >= -1 && sx <= src.width && sy <= src.height) {
      const x0 = clamp(Math.floor(sx), 0, src.width - 1)
      const y0 = clamp(Math.floor(sy), 0, src.height - 1)
      const x1 = clamp(x0 + 1, 0, src.width - 1)
      const y1 = clamp(y0 + 1, 0, src.height - 1)
      const fx = clamp(sx - x0, 0, 1)
      const fy = clamp(sy - y0, 0, 1)
      const at = (xx, yy) => {
        const i = (yy * src.width + xx) * src.channels
        const a = src.channels === 4 ? src.px[i + 3] / 255 : 1
        const bg = 255
        return [
          src.px[i] * a + bg * (1 - a),
          src.px[i + 1] * a + bg * (1 - a),
          src.px[i + 2] * a + bg * (1 - a),
        ]
      }
      const p00 = at(x0, y0), p10 = at(x1, y0), p01 = at(x0, y1), p11 = at(x1, y1)
      const mix = (i) =>
        (p00[i] * (1 - fx) + p10[i] * fx) * (1 - fy) + (p01[i] * (1 - fx) + p11[i] * fx) * fy
      r = mix(0); g = mix(1); b = mix(2)
    }

    const i = (y * SIZE + x) * 4
    const dEdge = -sdf // 距底板边缘的像素距离，>0 表示在内部
    const v = clamp((120 - dEdge) / 120, 0, 1)
    const shade = v * v * 0.8
    r = r + (236 - r) * shade
    g = g + (240 - g) * shade
    b = b + (247 - b) * shade
    if (dEdge < 1.6) { // 极细的描边，让圆角在白底上也看得见
      const k = ((1.6 - dEdge) / 1.6) * 0.14
      r = r + (0 - r) * k
      g = g + (0 - g) * k
      b = b + (0 - b) * k
    }
    out[i] = Math.round(r)
    out[i + 1] = Math.round(g)
    out[i + 2] = Math.round(b)
    out[i + 3] = Math.round(cover * 255)
  }
}

// ------------------------------------------------------------------ 编码 ---
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8
ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, png)
console.log(`icon written: ${OUT} (${(png.length / 1024).toFixed(1)} KB)`)
