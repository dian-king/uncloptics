import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 5199
const BASE = `http://localhost:${PORT}`

const server = spawn('node', ['node_modules/vite/bin/vite.js', '--port', String(PORT)], {
  stdio: 'ignore',
  detached: false,
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch {}
    await sleep(500)
  }
  throw new Error('dev server did not start')
}

const errors = []
const errorCounts = {}
const fail = (msg) => {
  errorCounts[msg] = (errorCounts[msg] || 0) + 1
  if (errorCounts[msg] <= 1) errors.push(msg)
}

async function check(name, fn) {
  try {
    await fn()
    console.log('  ✓ ' + name)
  } catch (e) {
    fail(`${name}: ${e.message.split('\n')[0]}`)
  }
}

async function main() {
  await waitForServer()
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    if (/Failed to load resource: the server responded with a status of 401/.test(text)) return
    fail(`console.error: ${text.slice(0, 200)}`)
  })

  console.log('home:')
  await check('loads and hero renders', async () => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForSelector('.hero-title', { timeout: 15000 })
    const text = await page.$eval('.hero-title', (el) => el.textContent)
    if (!text.includes('Joël')) throw new Error('hero title missing')
  })

  await check('webgl hero scene mounts', async () => {
    await page.waitForSelector('.hero-canvas canvas', { timeout: 15000 })
    await sleep(2500)
  })

  await check('gallery tiles render', async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForSelector('.tile', { timeout: 15000 })
    const count = await page.$$eval('.tile', (els) => els.length)
    console.log(`        (${count} tiles)`)
    if (count < 10) throw new Error(`expected >= 10 tiles, got ${count}`)
  })

  await check('category filter works', async () => {
    await page.$$eval('.filter-btn', (btns) => btns.find((b) => b.textContent === 'Nature')?.click())
    await sleep(900)
    const cats = new Set(await page.$$eval('.tile .tile-cat', (els) => els.map((e) => e.textContent)))
    if (cats.size !== 1 || !cats.has('Nature')) throw new Error(`filter mismatch: ${[...cats]}`)
    await page.$$eval('.filter-btn', (btns) => btns.find((b) => b.textContent === 'All')?.click())
    await sleep(900)
  })

  await check('lightbox opens and navigates', async () => {
    await page.click('.tile')
    await page.waitForSelector('.lightbox', { timeout: 10000 })
    await page.waitForSelector('.lightbox-image', { timeout: 15000 })
    const firstCount = await page.$eval('.lightbox-meta .count', (el) => el.textContent)
    await page.click('.lightbox-nav.next')
    await sleep(700)
    const secondCount = await page.$eval('.lightbox-meta .count', (el) => el.textContent)
    if (firstCount === secondCount) throw new Error('counter did not advance')
    await page.keyboard.press('Escape')
    await sleep(500)
    const stillOpen = await page.$('.lightbox')
    if (stillOpen) throw new Error('lightbox did not close on Escape')
  })

  await check('theme toggle switches to light mode', async () => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.theme-toggle', { timeout: 10000 })
    await page.click('.theme-toggle')
    await sleep(400)
    const theme = await page.$eval('html', (el) => el.dataset.theme || 'dark')
    if (theme !== 'light') throw new Error(`expected light theme, got ${theme}`)
    const bg = await page.$eval('body', (el) => getComputedStyle(el).backgroundColor)
    if (!/^\s*rgb\(244,\s*234,\s*216\)/.test(bg)) throw new Error(`expected cream bg, got ${bg}`)
    await page.click('.theme-toggle')
    await sleep(400)
    const themeBack = await page.$eval('html', (el) => el.dataset.theme || 'dark')
    if (themeBack !== 'dark') throw new Error('toggle did not return to dark')
  })

  console.log('pages:')
  await check('portfolio page shows category tiles', async () => {
    await page.goto(BASE + '/#/portfolio', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.cat-card', { timeout: 10000 })
    const count = await page.$$eval('.cat-card', (els) => els.length)
    if (count < 4) throw new Error(`expected >= 4 category tiles, got ${count}`)
  })

  await check('category page filters and opens lightbox', async () => {
    await page.goto(BASE + '/#/portfolio/Nature', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.tile', { timeout: 10000 })
    const count = await page.$$eval('.tile', (els) => els.length)
    if (count < 1) throw new Error('no tiles on category page')
    await page.click('.tile')
    await page.waitForSelector('.lightbox-dl', { timeout: 10000 })
    await page.keyboard.press('Escape')
  })

  await check('about page renders bio', async () => {
    await page.goto(BASE + '/#/about', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.about-grid', { timeout: 10000 })
  })

  console.log('contact:')
  await check('contact page loads', async () => {
    await page.goto(BASE + '/#/contact', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.contact-grid', { timeout: 10000 })
  })

  console.log('admin:')
  await check('login gate rejects wrong password', async () => {
    await page.goto(BASE + '/#/studio-vault', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.login-card', { timeout: 10000 })
    await page.type('input[type=password]', 'wrong')
    await page.click('.login-card .btn')
    await page.waitForSelector('.login-error', { timeout: 10000 })
  })

  await check('login with demo password unlocks studio', async () => {
    await page.$eval('input[type=password]', (el) => (el.value = ''))
    await page.type('input[type=password]', 'lumiere')
    await page.click('.login-card .btn')
    await page.waitForSelector('.dropzone', { timeout: 10000 })
  })

  const fs = await import('node:fs')
  const path = await import('node:path')
  const ROOT = process.cwd()
  const manifestFile = path.join(ROOT, 'src', 'data', 'photos.json')
  const beforeManifest = fs.readFileSync(manifestFile, 'utf8')
  const beforePhotos = fs.readdirSync(path.join(ROOT, 'public', 'photos'))
  const beforeThumbs = fs.readdirSync(path.join(ROOT, 'public', 'thumbnails'))

  const restore = () => {
    fs.writeFileSync(manifestFile, beforeManifest)
    for (const f of fs.readdirSync(path.join(ROOT, 'public', 'photos')))
      if (!beforePhotos.includes(f)) fs.rmSync(path.join(ROOT, 'public', 'photos', f), { force: true })
    for (const f of fs.readdirSync(path.join(ROOT, 'public', 'thumbnails')))
      if (!beforeThumbs.includes(f)) fs.rmSync(path.join(ROOT, 'public', 'thumbnails', f), { force: true })
  }

  try {
    await check('pending uploads appear for editing', async () => {
      const input = await page.$('input[type=file]')
      await input.uploadFile('public/thumbnails/t01.jpg', 'public/thumbnails/t02.jpg')
      await page.waitForFunction(() => document.querySelectorAll('.admin-item:not(.admin-current)').length === 2, { timeout: 15000 })
    })

    const beforeCount = parseInt(await page.$eval('.admin-gallery', (el) => el.dataset.count), 10)

    const selectPhoto = async (id) => {
      const total = parseInt(await page.$eval('.admin-gallery', (el) => el.dataset.count), 10)
      for (let i = 0; i < total + 6; i++) {
        const cur = await page.$eval('.admin-gallery', (el) => el.dataset.selected)
        if (cur === id) return true
        await page.click('.drum-next')
        try {
          await page.waitForFunction(
            (prevId) => document.querySelector('.admin-gallery').dataset.selected !== prevId,
            { timeout: 5000 },
            cur
          )
        } catch (e) {
          const st = await page.evaluate(() => {
            const g = document.querySelector('.admin-gallery')
            const d = document.querySelector('.drum')
            return {
              sel: g && g.dataset.selected,
              count: g && g.dataset.count,
              cls: d && d.className,
              rot: d && d.style.transform,
            }
          })
          console.log(`[selectPhoto] retrying iter ${i} targeting ${id}:`, JSON.stringify(st))
          await sleep(400)
        }
      }
      return false
    }

    await check('post publishes photos and they appear in the gallery', async () => {
      await page.click('.admin-actions .btn')
      await page.waitForFunction(
        (n) => parseInt(document.querySelector('.admin-gallery').dataset.count, 10) === n + 2,
        { timeout: 20000 },
        beforeCount
      )
      await sleep(600)
      const after = parseInt(await page.$eval('.admin-gallery', (el) => el.dataset.count), 10)
      if (after !== beforeCount + 2) throw new Error(`expected ${beforeCount + 2} photos, got ${after}`)
    })

    await check('manifest on disk updated', async () => {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
      if (manifest.photos.length !== beforeCount + 2) throw new Error(`manifest has ${manifest.photos.length} entries`)
      if (manifest.photos[manifest.photos.length - 1].source !== 'upload') throw new Error('new photo missing source=upload')
    })

    await check('new photo files written to disk', async () => {
      const nowPhotos = fs.readdirSync(path.join(ROOT, 'public', 'photos'))
      const nowThumbs = fs.readdirSync(path.join(ROOT, 'public', 'thumbnails'))
      const newP = nowPhotos.filter((f) => !beforePhotos.includes(f))
      const newT = nowThumbs.filter((f) => !beforeThumbs.includes(f))
      if (newP.length !== 2) throw new Error(`expected 2 new full images, got ${newP.length}`)
      if (newT.length !== 2) throw new Error(`expected 2 new thumbnails, got ${newT.length}`)
    })

    const lastManifest = () => JSON.parse(fs.readFileSync(manifestFile, 'utf8'))

    const lastId = (lastManifest().photos.filter((p) => p.source === 'upload').at(-1) || {}).id

    const guardUpload = (label) => {
      const photo = lastManifest().photos.find((p) => p.id === lastId)
      if (!photo || photo.source !== 'upload') {
        throw new Error(`${label}: lastId "${lastId}" is not an uploaded photo — refusing to touch real content`)
      }
    }

    const setInputValue = (sel, v) => page.$eval(sel, (el, value) => {
      const proto = el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, v)

    await check('edit panel saves title and description', async () => {
      guardUpload('edit')
      const ok = await selectPhoto(lastId)
      if (!ok) throw new Error('could not navigate to the new photo')
      await setInputValue('.admin-edit-name', 'Smoke Edit Title')
      await setInputValue('.admin-edit-desc', 'A description from the smoke test.')
      await page.click('.admin-save')
      await page.waitForFunction(
        () => document.querySelector('.admin-gallery').dataset.saved === '1',
        { timeout: 10000 }
      )
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
      const photo = manifest.photos.find((p) => p.id === lastId)
      if (!photo) throw new Error('edited photo missing from manifest')
      if (photo.title !== 'Smoke Edit Title') throw new Error(`title not saved (${photo.title})`)
      if (photo.description !== 'A description from the smoke test.') throw new Error('description not saved')
    })

    await check('delete removes photos from site and disk', async () => {
      guardUpload('delete')
      const ok = await selectPhoto(lastId)
      if (!ok) throw new Error('could not navigate to the new photo')
      await page.click('.admin-edit-del')
      await page.waitForSelector('.confirm-delete', { timeout: 5000 })
      await page.click('.confirm-delete')
      await page.waitForFunction(
        (n) => parseInt(document.querySelector('.admin-gallery').dataset.count, 10) === n,
        { timeout: 15000 },
        beforeCount + 1
      )
      await page.click('.admin-edit-del')
      await page.waitForSelector('.confirm-delete', { timeout: 5000 })
      await page.click('.confirm-delete')
      await page.waitForFunction(
        (n) => parseInt(document.querySelector('.admin-gallery').dataset.count, 10) === n,
        { timeout: 15000 },
        beforeCount
      )
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
      if (manifest.photos.length !== beforeCount) throw new Error('manifest not restored after delete')
      const nowPhotos = fs.readdirSync(path.join(ROOT, 'public', 'photos'))
      const nowThumbs = fs.readdirSync(path.join(ROOT, 'public', 'thumbnails'))
      const leftoverP = nowPhotos.filter((f) => !beforePhotos.includes(f))
      const leftoverT = nowThumbs.filter((f) => !beforeThumbs.includes(f))
      if (leftoverP.length || leftoverT.length) throw new Error('files left behind after delete')
    })
  } finally {
    restore()
  }

  await browser.close()
  server.kill()

  console.log('')
  if (errors.length === 0) {
    console.log('ALL CHECKS PASSED')
  } else {
    console.log(`${errors.length} unique issue(s):`)
    errors.forEach((e) => console.log(`  - ${e}  (x${errorCounts[e]})`))
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('smoke failed:', e)
  server.kill()
  process.exit(1)
})
