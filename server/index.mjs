import express from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiMount } from './api.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const PORT = process.env.PORT || 3000

const app = express()
app.use(apiMount)
app.use(express.static(DIST))

app.listen(PORT, () => {
  console.log(`Lumiere serving at http://localhost:${PORT}`)
  console.log(`Studio: http://localhost:${PORT}/#/studio-vault`)
})
