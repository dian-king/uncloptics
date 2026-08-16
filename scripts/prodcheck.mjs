import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = 'http://localhost:4173'

const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', '4173'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try { const res = await fetch(BASE); if (res.ok) return } catch {}
    await sleep(500)
  }
  throw new Error('preview server did not start')
}

const errors = []
const seen = new Set()

async function main() {
  await waitForServer()
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  page.on('pageerror', (e) => {
    const m = e.message.slice(0, 160)
    if (!seen.has(m)) { seen.add(m); errors.push(m) }
  })
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} -> ${r.url().replace(BASE, '')}`)
  })

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForSelector('.hero-title', { timeout: 15000 })
  await page.waitForSelector('.hero-canvas canvas', { timeout: 15000 })
  await sleep(3000)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForSelector('.tile', { timeout: 15000 })
  const tiles = await page.$$eval('.tile', (els) => els.length)

  const imgs = await page.$$eval('.tile img', (els) => els.length)
  let broken = 0
  for (const img of await page.$$('.tile img')) {
    const ok = await img.evaluate((el) => el.complete && el.naturalWidth > 0)
    if (!ok) broken++
  }

  await page.goto(BASE + '/#/contact', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('.contact-grid', { timeout: 10000 })
  await page.goto(BASE + '/#/studio-vault', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('.login-card', { timeout: 10000 })

  console.log(`tiles: ${tiles}, loaded images: ${imgs - broken}/${imgs}`)
  await browser.close()
  server.kill()

  if (errors.length) {
    console.log('PROD ISSUES:')
    errors.forEach((e) => console.log('  - ' + e))
    process.exit(1)
  }
  console.log('PROD CHECK PASSED')
}

main().catch((e) => { console.error(e); server.kill(); process.exit(1) })
