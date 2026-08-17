import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const TMP = process.env.TEMP
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const readList = (f) =>
  readFileSync(join(TMP, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)

const cats = {
  Nature: readList('ps_gallery-1_imgs.txt'),
  People: readList('ps_gallery-2_imgs.txt'),
  Wildlife: readList('ps_gallery-3_imgs.txt'),
  Lifestyle: readList('ps_gallery-4_imgs.txt'),
}

for (const k of Object.keys(cats)) cats[k] = [...new Set(cats[k])]

const cover = cats.Nature.find((u) => u.includes('DSC07420-6f139db0'))
for (const k of ['People', 'Wildlife', 'Lifestyle']) cats[k] = cats[k].filter((u) => u !== cover)

const strip = (f) => f.replace(/-[a-f0-9]{8}-1500\.(jpe?g)$/i, '')
const title = (base) => {
  if (base.startsWith('Thisisamansworld')) return "This Is a Man's World"
  if (base.startsWith('Somesearchtheworldforgold')) return 'Search the World for Gold'
  if (base.startsWith('Theserenityofnature')) return 'Serenity of Nature'
  if (base.startsWith('KGLA')) return 'Kigali'
  if (base.startsWith('G.R.I.N.D')) return 'G.R.I.N.D'
  if (base.startsWith('Free-dom')) return 'Free-dom'
  if (base.startsWith('ottotonym')) return 'Ottotonym'
  if (base === 'pic') return 'Pic'
  return 'Untitled'
}
const isCode = (base) => title(base) === 'Untitled'

const PHOTOS = join(ROOT, 'public', 'photos')
const THUMBS = join(ROOT, 'public', 'thumbnails')
for (const d of [PHOTOS, THUMBS]) rmSync(d, { recursive: true, force: true })
mkdirSync(PHOTOS, { recursive: true })
mkdirSync(THUMBS, { recursive: true })

let idx = 0
const photos = []
for (const [cat, urls] of Object.entries(cats)) {
  for (const url of urls) {
    idx++
    const num = String(idx).padStart(2, '0')
    const full = join(PHOTOS, `p${num}.jpg`)
    const thumb = join(THUMBS, `t${num}.jpg`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`fetch ${res.status} ${url}`)
    writeFileSync(full, Buffer.from(await res.arrayBuffer()))
    await sharp(full).rotate().resize({ width: 700 }).jpeg({ quality: 80 }).toFile(thumb)
    const base = strip(url.split('/').pop())
    photos.push({
      id: `p${num}`,
      title: isCode(base) ? 'Untitled' : title(base),
      category: cat,
      alt: base,
      featured: false,
      url: `photos/p${num}.jpg`,
      thumb: `thumbnails/t${num}.jpg`,
      source: 'joel',
    })
    console.log(`[ok] p${num}.jpg <- ${cat}`)
  }
}

photos.forEach((p, i) => { if (i % 8 === 0) p.featured = true })

const categories = Object.keys(cats)
const featuredCategories = categories.slice(0, 2)
const hero = photos
  .filter((p) => p.featured)
  .slice(0, 7)
  .map((p) => p.id)
  .concat(photos.filter((p) => p.title === 'Free-dom' || p.title === 'Kigali').map((p) => p.id))
  .slice(0, 9)

writeFileSync(
  join(ROOT, 'src', 'data', 'photos.json'),
  JSON.stringify({ photos, categories, featuredCategories, hero }, null, 2)
)
console.log(`done. ${photos.length} photos written to manifest (${categories.length} categories, ${hero.length} hero ids).`)
