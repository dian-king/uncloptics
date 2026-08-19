import { apiMount } from '../server/api.mjs'

export default function handler(req, res) {
  if (!req.url || !req.url.startsWith('/api/')) {
    const slug = req.query && req.query.slug
    const slugPath = Array.isArray(slug) ? slug.join('/') : slug || ''
    req.url = `/api/${slugPath}`
  }
  apiMount(req, res, () => {
    send404(res)
  })
}

function send404(res) {
  if (res.writableEnded || res.headersSent) return
  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Not found.' }))
}
