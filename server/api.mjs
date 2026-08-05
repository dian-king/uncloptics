import multer from 'multer'
import sharp from 'sharp'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = join(ROOT, 'src', 'data', 'photos.json')
const PHOTOS_DIR = join(ROOT, 'public', 'photos')
const THUMBS_DIR = join(ROOT, 'public', 'thumbnails')

const DEFAULT_CATEGORIES = ['Portraits', 'Landscapes', 'Street', 'Events']
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

function readManifest() {
  try {
    const m = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    if (!Array.isArray(m.featuredCategories)) m.featuredCategories = []
    return m
  } catch {
    return { categories: DEFAULT_CATEGORIES, photos: [], featuredCategories: [] }
  }
}

function writeManifest(manifest) {
  writeFileSync(DATA_FILE, JSON.stringify(manifest, null, 2) + '\n')
}

function nextIndex(manifest) {
  let max = 0
  for (const p of manifest.photos) {
    const m = /^p(\d+)(?:\.[a-z0-9]+)?$/i.exec(p.url.split('/').pop() || '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'photo'
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
})

async function handleGet(req, res) {
  sendJson(res, 200, readManifest())
}

async function handlePost(req, res) {
  if (!req.file) return sendJson(res, 400, { error: 'No file received.' })
  const mime = req.file.mimetype || ''
  if (!mime.startsWith('image/')) return sendJson(res, 400, { error: 'File is not an image.' })

  const manifest = readManifest()
  const idx = nextIndex(manifest)
  const name = `p${String(idx).padStart(2, '0')}`
  const ext = EXT_BY_MIME[mime] || 'jpg'
  const fileName = `${name}.${ext}`
  const thumbName = `t${String(idx).padStart(2, '0')}.jpg`

  const title = (req.body.title || '').trim() || basename(req.file.originalname || '').replace(/\.[^.]+$/, '')
  const category = (req.body.category || '').trim() || 'Portraits'
  const alt = (req.body.alt || '').trim() || title
  const description = (req.body.description || '').trim()

  await writeFile(join(PHOTOS_DIR, fileName), req.file.buffer)

  const thumb = await sharp(req.file.buffer)
    .rotate()
    .resize({ width: 480, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
  await writeFile(join(THUMBS_DIR, thumbName), thumb)

  const photo = {
    id: slugify(title),
    title,
    category,
    alt,
    description,
    featured: false,
    url: `photos/${fileName}`,
    thumb: `thumbnails/${thumbName}`,
    source: 'upload',
  }

  if (!manifest.categories.includes(category)) {
    manifest.categories = [...manifest.categories, category]
  }
  manifest.photos.push(photo)
  writeManifest(manifest)

  sendJson(res, 201, { photo })
}

function handleDelete(req, res, id) {
  const manifest = readManifest()
  const index = manifest.photos.findIndex((p) => p.id === id)
  if (index === -1) return sendJson(res, 404, { error: 'Photo not found.' })

  const [photo] = manifest.photos.splice(index, 1)
  writeManifest(manifest)

  for (const rel of [photo.url, photo.thumb]) {
    if (!rel) continue
    const full = join(ROOT, 'public', rel)
    if (existsSync(full)) rmSync(full, { force: true })
  }

  sendJson(res, 200, { ok: true })
}

function handlePatch(req, res, id) {
  const manifest = readManifest()
  const photo = manifest.photos.find((p) => p.id === id)
  if (!photo) return sendJson(res, 404, { error: 'Photo not found.' })

  const body = req.body || {}
  if (typeof body.title === 'string' && body.title.trim()) {
    photo.title = body.title.trim()
    photo.alt = photo.alt || photo.title
  }
  if (typeof body.category === 'string' && body.category.trim()) {
    photo.category = body.category.trim()
    if (!manifest.categories.includes(photo.category)) {
      manifest.categories = [...manifest.categories, photo.category]
    }
  }
  if (typeof body.description === 'string') {
    photo.description = body.description.trim()
  }
  if (body.featured !== undefined) {
    photo.featured = body.featured === true || body.featured === 'true'
  }

  writeManifest(manifest)
  sendJson(res, 200, { photo })
}

function readJsonBody(req, res, next) {
  const m = (req.method || '').toUpperCase()
  if (m !== 'PATCH' && m !== 'POST') return next()
  let data = ''
  req.on('data', (chunk) => {
    data += chunk
    if (data.length > 1e6) req.destroy()
  })
  req.on('end', () => {
    try {
      req.body = data ? JSON.parse(data) : {}
    } catch {
      req.body = {}
    }
    next()
  })
  req.on('error', () => next())
}

function handleCollectionsPost(req, res) {
  const manifest = readManifest()
  const name = String((req.body && req.body.name) || '').trim()
  if (!name) return sendJson(res, 400, { error: 'Collection name is required.' })
  if (!manifest.categories.includes(name)) {
    manifest.categories = [...manifest.categories, name]
  }
  writeManifest(manifest)
  sendJson(res, 201, manifest)
}

function handleCollectionsPatch(req, res, name) {
  const manifest = readManifest()
  if (!manifest.categories.includes(name)) return sendJson(res, 404, { error: 'Collection not found.' })
  const featured = req.body && (req.body.featured === true || req.body.featured === 'true')
  if (featured) {
    if (!manifest.featuredCategories.includes(name)) manifest.featuredCategories.push(name)
  } else {
    manifest.featuredCategories = manifest.featuredCategories.filter((c) => c !== name)
  }
  writeManifest(manifest)
  sendJson(res, 200, manifest)
}

function handleCollectionsDelete(req, res, name) {
  const manifest = readManifest()
  if (!manifest.categories.includes(name)) return sendJson(res, 404, { error: 'Collection not found.' })
  const fallback = manifest.categories.find((c) => c !== name) || 'Portraits'
  manifest.categories = manifest.categories.filter((c) => c !== name)
  if (!manifest.categories.includes(fallback)) manifest.categories = [fallback, ...manifest.categories]
  for (const p of manifest.photos) {
    if (p.category === name) p.category = fallback
  }
  manifest.featuredCategories = manifest.featuredCategories.filter((c) => c !== name)
  writeManifest(manifest)
  sendJson(res, 200, manifest)
}

function handleError(err, req, res, next) {
  if (err) {
    console.error('[api] error:', err.message)
    sendJson(res, err.code === 'LIMIT_FILE_SIZE' ? 413 : 500, { error: err.message || 'Server error.' })
    return
  }
  next()
}

function route(method, pattern, ...handlers) {
  return (req, res, next) => {
    if ((req.method || '').toUpperCase() !== method) return next()
    const match = pattern.exec(req.url.split('?')[0])
    if (!match) return next()
    let i = 0
    const run = () => {
      const h = handlers[i++]
      if (!h) return next()
      h(req, res, run)
    }
    run()
  }
}

export const apiMiddleware = [
  route('GET', /^\/api\/photos\/?$/, (req, res) => handleGet(req, res).catch((e) => { console.error('[api]', e); sendJson(res, 500, { error: 'Read failed.' }) })),
  route('POST', /^\/api\/photos\/?$/, upload.single('file'), (req, res) => handlePost(req, res).catch((e) => { console.error('[api] upload failed:', e); sendJson(res, 500, { error: 'Upload failed. Check the server logs.' }) })),
  route('DELETE', /^\/api\/photos\/([^/]+)\/?$/, (req, res, next) => {
    const m = /^\/api\/photos\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    handleDelete(req, res, decodeURIComponent(m[1]))
  }),
  route('PATCH', /^\/api\/photos\/([^/]+)\/?$/, readJsonBody, (req, res, next) => {
    const m = /^\/api\/photos\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    handlePatch(req, res, decodeURIComponent(m[1]))
  }),
  route('POST', /^\/api\/collections\/?$/, readJsonBody, (req, res) => handleCollectionsPost(req, res)),
  route('PATCH', /^\/api\/collections\/([^/]+)\/?$/, readJsonBody, (req, res, next) => {
    const m = /^\/api\/collections\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    handleCollectionsPatch(req, res, decodeURIComponent(m[1]))
  }),
  route('DELETE', /^\/api\/collections\/([^/]+)\/?$/, (req, res, next) => {
    const m = /^\/api\/collections\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    handleCollectionsDelete(req, res, decodeURIComponent(m[1]))
  }),
]

export function apiMount(req, res, next) {
  if (!req.url.startsWith('/api/')) return next()
  let i = 0
  const run = () => {
    const mw = apiMiddleware[i++]
    if (!mw) {
      sendJson(res, 404, { error: 'Not found.' })
      return
    }
    mw(req, res, (err) => {
      if (err) return handleError(err, req, res, run)
      run()
    })
  }
  run()
}
