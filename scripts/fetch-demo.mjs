import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const photosDir = join(root, 'public', 'photos')
const thumbsDir = join(root, 'public', 'thumbnails')
const dataDir = join(root, 'src', 'data')

const ITEMS = [
  { id: 'maya', title: 'Maya', category: 'Portraits', alt: 'Woman laughing portrait', unsplash: '1494790108377-be9c29b29330', picsum: [1011, 1200, 1600] },
  { id: 'in-the-studio', title: 'In the studio', category: 'Portraits', alt: 'Studio portrait', unsplash: '1534528741775-53994a69daeb', picsum: [1005, 1100, 1600] },
  { id: 'portrait-noon', title: 'Portrait, noon', category: 'Portraits', alt: 'Man portrait', unsplash: '1500648767791-00dcc994a43e', picsum: [823, 1100, 1600] },
  { id: 'the-suit', title: 'The suit', category: 'Portraits', alt: 'Man in a suit', unsplash: '1519085360753-af0119f7cbe7', picsum: [338, 1100, 1600] },
  { id: 'profile', title: 'Profile', category: 'Portraits', alt: 'Woman portrait profile', unsplash: '1544005313-94ddf0286df2', picsum: [64, 1100, 1600] },
  { id: 'golden-hour-field', title: 'Golden hour', category: 'Landscapes', alt: 'Field at dusk', unsplash: '1472214103451-9374bd1c798e', picsum: [1015, 1600, 1067] },
  { id: 'the-peak', title: 'The peak', category: 'Landscapes', alt: 'Snowy mountain peak', unsplash: '1506905925346-21bda4d32df4', picsum: [1016, 1600, 1067] },
  { id: 'birch-light', title: 'Birch light', category: 'Landscapes', alt: 'Sunlit birch forest', unsplash: '1447752875215-b2761acb3c5d', picsum: [1018, 1600, 1067] },
  { id: 'mist', title: 'Mist', category: 'Landscapes', alt: 'Foggy ridge', unsplash: '1470071459604-3b5ec3a7fe05', picsum: [1035, 1600, 1067] },
  { id: 'cathedral-of-light', title: 'Cathedral of light', category: 'Landscapes', alt: 'Sunbeams through forest', unsplash: '1441974231531-c6227db76b6e', picsum: [1036, 1600, 1067] },
  { id: 'river-valley', title: 'River valley', category: 'Landscapes', alt: 'River between mountains', unsplash: '1469474968028-56623f02e42e', picsum: [1039, 1600, 1067] },
  { id: 'skyline', title: 'Skyline', category: 'Street', alt: 'City skyline at dusk', unsplash: '1477959858617-67f85cf4f1df', picsum: [1047, 1600, 1067] },
  { id: 'night-city', title: 'Night city', category: 'Street', alt: 'City street at night', unsplash: '1519501025264-65ba15a82390', picsum: [1050, 1600, 1067] },
  { id: 'the-photographer', title: 'The photographer', category: 'Street', alt: 'Photographer on the street', unsplash: '1502920917128-1aa500764cbd', picsum: [175, 1600, 1067] },
  { id: 'crossing', title: 'Crossing', category: 'Street', alt: 'Pedestrian crossing', unsplash: '1452587925148-ce544e77e70d', picsum: [123, 1600, 1067] },
  { id: 'stage-lights', title: 'Stage lights', category: 'Events', alt: 'Concert stage lights', unsplash: '1470229722913-7c0e2dbbafd3', picsum: [1069, 1600, 1067] },
  { id: 'hands-up', title: 'Hands up', category: 'Events', alt: 'Crowd at a concert', unsplash: '1429962714451-bb934ecdc4ec', picsum: [1076, 1600, 1067] },
  { id: 'confetti', title: 'Confetti', category: 'Events', alt: 'Confetti at a celebration', unsplash: '1492684223066-81342ee5ff30', picsum: [1084, 1600, 1067] },
  { id: 'the-venue', title: 'The venue', category: 'Events', alt: 'Wedding venue decor', unsplash: '1511578314322-379afb476865', picsum: [225, 1600, 1067] },
  { id: 'first-dance', title: 'First dance', category: 'Events', alt: 'Couple first dance', unsplash: '1519741497674-611481863552', picsum: [20, 1600, 1067] },
]

const CATEGORIES = ['Portraits', 'Landscapes', 'Street', 'Events']

function unsplashUrl(id, w, q) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format`
}
function picsumUrl([id, w, h]) {
  return `https://picsum.photos/id/${id}/${w}/${h}`
}

async function tryDownload(url, dest) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (!type.startsWith('image/')) throw new Error(`not an image: ${type}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return buf.length
}

async function main() {
  await mkdir(photosDir, { recursive: true })
  await mkdir(thumbsDir, { recursive: true })
  await mkdir(dataDir, { recursive: true })

  const manifest = []
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i]
    const n = String(i + 1).padStart(2, '0')
    const file = `p${n}.jpg`
    const thumb = `t${n}.jpg`
    const fullPath = join(photosDir, file)
    const thumbPath = join(thumbsDir, thumb)

    let from = 'existing'
    if (!existsSync(fullPath) || !existsSync(thumbPath)) {
      try {
        await tryDownload(unsplashUrl(item.unsplash, 1600, 80), fullPath)
        await tryDownload(unsplashUrl(item.unsplash, 480, 70), thumbPath)
        from = 'unsplash'
        console.log(`[ok] ${file} <- unsplash`)
      } catch (e) {
        from = 'picsum'
        console.log(`[!] unsplash failed for ${item.id} (${e.message}) -> picsum fallback`)
        await tryDownload(picsumUrl(item.picsum), fullPath)
        await tryDownload(`https://picsum.photos/id/${item.picsum[0]}/480`, thumbPath)
        console.log(`[ok] ${file} <- picsum`)
      }
    } else {
      console.log(`[skip] ${file} (already exists)`)
    }

    manifest.push({
      id: item.id,
      title: item.title,
      category: item.category,
      alt: item.alt,
      featured: i < 8,
      url: `photos/${file}`,
      thumb: `thumbnails/${thumb}`,
      source: from,
    })
  }

  await writeFile(
    join(dataDir, 'photos.json'),
    JSON.stringify({ categories: CATEGORIES, photos: manifest }, null, 2)
  )
  console.log(`done. ${manifest.length} photos written to manifest.`)
}

main().catch((e) => {
  console.error('failed:', e)
  process.exit(1)
})
