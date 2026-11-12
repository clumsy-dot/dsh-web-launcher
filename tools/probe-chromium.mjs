// 不下载整包，用 HTTP Range 读取 Chromium 快照 zip 里的 Info.plist，
// 判断它要求的 macOS 版本。用法：node probe-chromium.mjs <revision>
import { inflateRawSync } from 'node:zlib'

const rev = process.argv[2]
const base = `https://registry.npmmirror.com/-/binary/chromium-browser-snapshots/Mac/${rev}/chrome-mac.zip`

async function rangeGet(start, end) {
  const res = await fetch(base, { headers: { Range: `bytes=${start}-${end}` } })
  if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const total = res.headers.get('content-range')?.split('/')?.[1]
  return { buf, total: total ? Number(total) : null }
}

const probe = await rangeGet(0, 0)
const size = probe.total
if (!size) throw new Error('拿不到文件大小')
if (size < 1024) throw new Error('文件太小，可能是错误页')

// 1) 末尾 128KB 找 EOCD
const tailStart = Math.max(0, size - 131072)
const { buf: tail } = await rangeGet(tailStart, size - 1)
let eocd = -1
for (let i = tail.length - 22; i >= 0; i--) {
  if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
}
if (eocd < 0) throw new Error('找不到 zip 目录')

const cdSize = tail.readUInt32LE(eocd + 12)
const cdOffset = tail.readUInt32LE(eocd + 16)

// 2) 读中央目录
const { buf: cd } = await rangeGet(cdOffset, cdOffset + cdSize - 1)
const entries = []
let p = 0
while (p + 46 <= cd.length && cd.readUInt32LE(p) === 0x02014b50) {
  const method = cd.readUInt16LE(p + 10)
  const compSize = cd.readUInt32LE(p + 20)
  const nameLen = cd.readUInt16LE(p + 28)
  const extraLen = cd.readUInt16LE(p + 30)
  const commentLen = cd.readUInt16LE(p + 32)
  const localOffset = cd.readUInt32LE(p + 42)
  const name = cd.toString('utf8', p + 46, p + 46 + nameLen)
  entries.push({ name, method, compSize, localOffset })
  p += 46 + nameLen + extraLen + commentLen
}

const target = entries.find((e) => /Chromium\.app\/Contents\/Info\.plist$/.test(e.name))
if (!target) throw new Error('zip 里没有 Chromium.app/Contents/Info.plist')

// 3) 读该条目
const { buf: lh } = await rangeGet(target.localOffset, target.localOffset + 29)
if (lh.readUInt32LE(0) !== 0x04034b50) throw new Error('本地头损坏')
const nameLen = lh.readUInt16LE(26)
const extraLen = lh.readUInt16LE(28)
const dataStart = target.localOffset + 30 + nameLen + extraLen
const { buf: raw } = await rangeGet(dataStart, dataStart + target.compSize - 1)
const text = (target.method === 8 ? inflateRawSync(raw) : raw).toString('utf8')

const minOS = text.match(/<key>LSMinimumSystemVersion<\/key>\s*<string>([^<]+)<\/string>/)?.[1] ?? '?'
const version = text.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1] ?? '?'
console.log(JSON.stringify({ rev, version, minOS, sizeMB: Math.round(size / 1048576) }))
