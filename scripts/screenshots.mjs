import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = 'http://localhost:5173'
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots')

const server = spawn('node', ['node_modules/vite/bin/vite.js'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try { const res = await fetch(BASE); if (res.ok) return } catch {}
    await sleep(500)
  }
  throw new Error('dev server did not start')
}

const main = async () => {
  await waitForServer()
  await mkdir(out, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // Home — hero viewport
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForSelector('.hero-title', { timeout: 15000 })
  await page.waitForSelector('.hero-canvas canvas', { timeout: 15000 })
  await sleep(4500)
  await page.screenshot({ path: join(out, '01-hero.png') })
  console.log('01-hero.png')

  // Home — full page (hero + intro + gallery)
  await sleep(1000)
  await page.screenshot({ path: join(out, '02-home-full.png'), fullPage: true })
  console.log('02-home-full.png')

  // Gallery section close-up
  await page.evaluate(() => document.getElementById('work')?.scrollIntoView())
  await sleep(1500)
  await page.screenshot({ path: join(out, '03-gallery.png') })
  console.log('03-gallery.png')

  // Lightbox open
  await page.click('.tile')
  await page.waitForSelector('.lightbox-image', { timeout: 15000 })
  await sleep(1200)
  await page.screenshot({ path: join(out, '04-lightbox.png') })
  console.log('04-lightbox.png')
  await page.keyboard.press('Escape')
  await sleep(400)

  // Contact
  await page.goto(BASE + '/#/contact', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('.contact-grid', { timeout: 10000 })
  await sleep(1200)
  await page.screenshot({ path: join(out, '05-contact.png') })
  console.log('05-contact.png')

  // Admin login
  await page.goto(BASE + '/#/admin', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('.login-card', { timeout: 10000 })
  await sleep(800)
  await page.screenshot({ path: join(out, '06-admin-login.png') })
  console.log('06-admin-login.png')

  await browser.close()
  server.kill()
  console.log('done ->', out)
}

main().catch((e) => { console.error(e); server.kill(); process.exit(1) })
