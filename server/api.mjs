import multer from 'multer'
import sharp from 'sharp'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { get, put, del } from '@vercel/blob'

const require = createRequire(import.meta.url)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = join(ROOT, 'src', 'data', 'photos.json')
const PHOTOS_DIR = join(ROOT, 'public', 'photos')
const THUMBS_DIR = join(ROOT, 'public', 'thumbnails')

const DEFAULT_CATEGORIES = ['Nature', 'People', 'Wildlife', 'Lifestyle']
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lumiere'
const TOKEN_TTL = 12 * 60 * 60 * 1000
const TOKEN_SECRET = process.env.TOKEN_SECRET || sha256(`uncloptics:${ADMIN_PASSWORD}`)

const CLOUD = !!process.env.BLOB_READ_WRITE_TOKEN

const AUTH_MAX_FAILS = 5
const AUTH_WINDOW_MS = 10 * 60 * 1000
const AUTH_LOCK_MS = 10 * 60 * 1000
const authFails = new Map()

const SEED_MANIFEST = require('../src/data/photos.json')

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[api] Using the default admin password. Set the ADMIN_PASSWORD env var to secure the studio.')
}
if (!CLOUD) {
  console.warn('[api] Local storage mode: uploads are written to the project folder.')
}

function sha256(text) {
  return createHash('sha256').update(String(text)).digest('hex')
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function queryToken(req) {
  const q = (req.url || '').split('?')[1]
  return q ? new URLSearchParams(q).get('token') || '' : ''
}

function ipOf(req) {
  return req.socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown'
}

function isLocked(req) {
  const rec = authFails.get(ipOf(req))
  return !!rec && rec.lockedUntil && rec.lockedUntil > Date.now()
}

function recordFail(req) {
  const ip = ipOf(req)
  const now = Date.now()
  const rec = authFails.get(ip)
  if (!rec || now - rec.first > AUTH_WINDOW_MS) {
    authFails.set(ip, { count: 1, first: now })
  } else {
    rec.count += 1
    if (rec.count >= AUTH_MAX_FAILS) rec.lockedUntil = now + AUTH_LOCK_MS
  }
  if (authFails.size > 2000) {
    for (const [key, value] of authFails) {
      if (now - value.first > AUTH_WINDOW_MS && now - (value.lockedUntil || 0) > AUTH_WINDOW_MS) authFails.delete(key)
    }
  }
}

function clearFails(req) {
  authFails.delete(ipOf(req))
}

function signToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL })).toString('base64url')
  const sig = createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const expected = createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  if (!safeEqual(sig, expected)) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : queryToken(req)
  if (verifyToken(token)) return next()
  sendJson(res, 401, { error: 'Not authorised.' })
}

function handleAuth(req, res) {
  if (isLocked(req)) return sendJson(res, 429, { error: 'Too many attempts. Try again later.' })
  const password = String((req.body && req.body.password) || '')
  if (!safeEqual(sha256(password), sha256(ADMIN_PASSWORD))) {
    recordFail(req)
    setTimeout(() => sendJson(res, 401, { error: 'Not authorised.' }), 600)
    return
  }
  clearFails(req)
  sendJson(res, 200, { ok: true, token: signToken() })
}

function handleLogout(req, res) {
  sendJson(res, 200, { ok: true })
}

function normalizeManifest(m) {
  if (!m || typeof m !== 'object') m = {}
  if (!Array.isArray(m.categories)) m.categories = DEFAULT_CATEGORIES
  if (!Array.isArray(m.photos)) m.photos = []
  if (!Array.isArray(m.featuredCategories)) m.featuredCategories = []
  if (!Array.isArray(m.hero)) m.hero = []
  return m
}

async function readManifest() {
  if (CLOUD) {
    try {
      const result = await get('photos.json', { token: process.env.BLOB_READ_WRITE_TOKEN })
      if (result && result.blob) {
        const text = await result.blob.text()
        if (text) return normalizeManifest(JSON.parse(text))
      }
    } catch (e) {
      console.error('[api] blob read failed, seeding manifest:', e.message)
    }
    const seed = normalizeManifest(JSON.parse(JSON.stringify(SEED_MANIFEST)))
    try {
      await writeManifest(seed)
    } catch (e) {
      console.error('[api] could not seed blob manifest:', e.message)
    }
    return seed
  }
  try {
    return normalizeManifest(JSON.parse(readFileSync(DATA_FILE, 'utf8')))
  } catch {
    return normalizeManifest(JSON.parse(JSON.stringify(SEED_MANIFEST)))
  }
}

async function writeManifest(manifest) {
  const body = JSON.stringify(manifest, null, 2) + '\n'
  if (CLOUD) {
    await put('photos.json', body, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return
  }
  writeFileSync(DATA_FILE, body)
}

function nextIndex(manifest) {
  let max = 0
  for (const p of manifest.photos) {
    const m = /^p(\d+)(?:\.[a-z0-9]+)?$/i.exec(p.url.split('/').pop() || '')
    if (m) max = Math.max(max, Number(m[1]))
    const idm = /^p(\d+)/i.exec(p.id || '')
    if (idm) max = Math.max(max, Number(idm[1]))
  }
  return Math.max(max, manifest.photos.length) + 1
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'photo'
}

function sendJson(res, status, data) {
  if (res.writableEnded || res.headersSent) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
})

async function handleGet(req, res) {
  const manifest = await readManifest()
  sendJson(res, 200, { ...manifest, uploadMode: CLOUD ? 'blob' : 'server' })
}

async function handleLocalPost(req, res) {
  if (!req.file) return sendJson(res, 400, { error: 'No file received.' })
  const mime = req.file.mimetype || ''
  if (!mime.startsWith('image/')) return sendJson(res, 400, { error: 'File is not an image.' })

  const manifest = await readManifest()
  const idx = nextIndex(manifest)
  const name = `p${String(idx).padStart(2, '0')}`
  const ext = EXT_BY_MIME[mime] || 'jpg'
  const fileName = `${name}.${ext}`
  const thumbName = `t${String(idx).padStart(2, '0')}.jpg`

  const title = (req.body.title || '').trim() || basename(req.file.originalname || '').replace(/\.[^.]+$/, '')
  const category = (req.body.category || '').trim() || 'Nature'
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
  await writeManifest(manifest)

  sendJson(res, 201, { photo })
}

async function handleCloudPost(req, res) {
  const url = String((req.body && req.body.url) || '').trim()
  if (!/^https?:\/\//.test(url)) return sendJson(res, 400, { error: 'Missing uploaded file URL.' })

  let buf
  let mime = ''
  try {
    const fetched = await fetch(url)
    if (!fetched.ok) throw new Error(`upstream ${fetched.status}`)
    mime = fetched.headers.get('content-type') || ''
    buf = Buffer.from(await fetched.arrayBuffer())
  } catch (e) {
    return sendJson(res, 400, { error: `Could not read the uploaded file (${e.message}).` })
  }
  if (!mime.startsWith('image/')) return sendJson(res, 400, { error: 'File is not an image.' })

  const manifest = await readManifest()
  const idx = nextIndex(manifest)
  const thumbName = `t${String(idx).padStart(2, '0')}.jpg`

  const title = (req.body.title || '').trim() || 'Photo'
  const category = (req.body.category || '').trim() || 'Nature'
  const alt = (req.body.alt || '').trim() || title
  const description = (req.body.description || '').trim()

  const thumb = await sharp(buf)
    .rotate()
    .resize({ width: 480, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()

  let thumbBlob
  try {
    thumbBlob = await put(`thumbnails/${thumbName}`, thumb, {
      access: 'public',
      contentType: 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
  } catch (e) {
    return sendJson(res, 500, { error: `Could not store the thumbnail (${e.message}).` })
  }

  const photo = {
    id: slugify(title),
    title,
    category,
    alt,
    description,
    featured: false,
    url,
    thumb: thumbBlob.url,
    source: 'upload',
  }

  if (!manifest.categories.includes(category)) {
    manifest.categories = [...manifest.categories, category]
  }
  manifest.photos.push(photo)
  await writeManifest(manifest)

  sendJson(res, 201, { photo })
}

async function handlePost(req, res) {
  if (CLOUD) return handleCloudPost(req, res)
  return handleLocalPost(req, res)
}

async function handleDelete(req, res, id) {
  const manifest = await readManifest()
  const index = manifest.photos.findIndex((p) => p.id === id)
  if (index === -1) return sendJson(res, 404, { error: 'Photo not found.' })

  const [photo] = manifest.photos.splice(index, 1)
  await writeManifest(manifest)

  if (CLOUD) {
    const targets = [photo.url, photo.thumb].filter((u) => u && /^https?:\/\//.test(u))
    if (targets.length) {
      try {
        await del(targets, { token: process.env.BLOB_READ_WRITE_TOKEN })
      } catch (e) {
        console.error('[api] blob delete failed:', e.message)
      }
    }
  } else {
    for (const rel of [photo.url, photo.thumb]) {
      if (!rel) continue
      const full = join(ROOT, 'public', rel)
      if (existsSync(full)) rmSync(full, { force: true })
    }
  }

  sendJson(res, 200, { ok: true })
}

async function handlePatch(req, res, id) {
  const manifest = await readManifest()
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

  await writeManifest(manifest)
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

async function handleUploadToken(req, res) {
  if (!CLOUD) return sendJson(res, 501, { error: 'Blob storage is not configured on this host.' })
  try {
    const { handleUpload } = await import('@vercel/blob/client')
    const jsonResponse = await handleUpload({
      body: req.body || {},
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ pathname }),
      }),
    })
    sendJson(res, 200, jsonResponse)
  } catch (e) {
    sendJson(res, 400, { error: e.message || 'Upload token failed.' })
  }
}

async function handleCollectionsPost(req, res) {
  const manifest = await readManifest()
  const name = String((req.body && req.body.name) || '').trim()
  if (!name) return sendJson(res, 400, { error: 'Collection name is required.' })
  if (!manifest.categories.includes(name)) {
    manifest.categories = [...manifest.categories, name]
  }
  await writeManifest(manifest)
  sendJson(res, 201, manifest)
}

async function handleCollectionsPatch(req, res, name) {
  const manifest = await readManifest()
  if (!manifest.categories.includes(name)) return sendJson(res, 404, { error: 'Collection not found.' })
  const featured = req.body && (req.body.featured === true || req.body.featured === 'true')
  if (featured) {
    if (!manifest.featuredCategories.includes(name)) manifest.featuredCategories.push(name)
  } else {
    manifest.featuredCategories = manifest.featuredCategories.filter((c) => c !== name)
  }
  await writeManifest(manifest)
  sendJson(res, 200, manifest)
}

async function handleCollectionsDelete(req, res, name) {
  const manifest = await readManifest()
  if (!manifest.categories.includes(name)) return sendJson(res, 404, { error: 'Collection not found.' })
  const fallback = manifest.categories.find((c) => c !== name) || 'Nature'
  manifest.categories = manifest.categories.filter((c) => c !== name)
  if (!manifest.categories.includes(fallback)) manifest.categories = [fallback, ...manifest.categories]
  for (const p of manifest.photos) {
    if (p.category === name) p.category = fallback
  }
  manifest.featuredCategories = manifest.featuredCategories.filter((c) => c !== name)
  await writeManifest(manifest)
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
      try {
        Promise.resolve(h(req, res, run)).catch((err) => handleError(err, req, res, run))
      } catch (err) {
        handleError(err, req, res, run)
      }
    }
    run()
  }
}

export const apiMiddleware = [
  route('POST', /^\/api\/auth\/logout\/?$/, handleLogout),
  route('POST', /^\/api\/auth\/?$/, readJsonBody, handleAuth),
  route('GET', /^\/api\/photos\/?$/, (req, res) => handleGet(req, res).catch((e) => { console.error('[api]', e); sendJson(res, 500, { error: 'Read failed.' }) })),
  route('POST', /^\/api\/upload-token\/?$/, requireAuth, readJsonBody, (req, res) => handleUploadToken(req, res).catch((e) => { console.error('[api] upload token failed:', e); sendJson(res, 500, { error: 'Upload token failed.' }) })),
  route('POST', /^\/api\/photos\/?$/, requireAuth, CLOUD ? readJsonBody : upload.single('file'), (req, res) => handlePost(req, res).catch((e) => { console.error('[api] upload failed:', e); sendJson(res, 500, { error: 'Upload failed. Check the server logs.' }) })),
  route('DELETE', /^\/api\/photos\/([^/]+)\/?$/, requireAuth, (req, res, next) => {
    const m = /^\/api\/photos\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    return handleDelete(req, res, decodeURIComponent(m[1]))
  }),
  route('PATCH', /^\/api\/photos\/([^/]+)\/?$/, requireAuth, readJsonBody, (req, res, next) => {
    const m = /^\/api\/photos\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    return handlePatch(req, res, decodeURIComponent(m[1]))
  }),
  route('POST', /^\/api\/collections\/?$/, requireAuth, readJsonBody, (req, res) => handleCollectionsPost(req, res)),
  route('PATCH', /^\/api\/collections\/([^/]+)\/?$/, requireAuth, readJsonBody, (req, res, next) => {
    const m = /^\/api\/collections\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    return handleCollectionsPatch(req, res, decodeURIComponent(m[1]))
  }),
  route('DELETE', /^\/api\/collections\/([^/]+)\/?$/, requireAuth, (req, res, next) => {
    const m = /^\/api\/collections\/([^/]+)\/?$/.exec(req.url.split('?')[0])
    return handleCollectionsDelete(req, res, decodeURIComponent(m[1]))
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
    try {
      Promise.resolve(mw(req, res, (err) => {
        if (err) return handleError(err, req, res, run)
        run()
      })).catch((err) => handleError(err, req, res, run))
    } catch (err) {
      handleError(err, req, res, run)
    }
  }
  run()
}
