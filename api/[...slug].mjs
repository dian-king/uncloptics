import { apiMount } from '../server/api.mjs'

export default function handler(req, res) {
  if (!req.url) {
    const slug = req.query && req.query.slug
    if (Array.isArray(slug)) req.url = `/${slug.join('/')}`
    else if (slug) req.url = `/${slug}`
    else req.url = '/'
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
