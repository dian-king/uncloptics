# Uncloptics — Photography Gallery

A dark, cinematic single-page gallery webapp for **Joel Ishimwe** (Uncloptics), built with
**React + Vite** and a **Three.js (react-three-fiber)** hero scene. Smooth Lenis scrolling,
parallax, per-category portfolio pages, a masonry gallery with category filtering, a
fullscreen lightbox with downloads, an about page, a contact page, and a password-gated
studio for managing photos.

> Demo site — swap in the photographer's real name, photos, and contact details before publishing.

---

## Features

- **Cinematic hero** — fullscreen Three.js scene: floating photos drifting in fog with
  gold dust particles and mouse parallax. three.js is code-split and only loads on the home page.
- **Portfolio pages** — `/portfolio` with cover tiles per collection, each opening its own
  category page (`/portfolio/nature`, `/people`, `/wildlife`, `/lifestyle`).
- **Masonry gallery** — responsive multi-column grid with hover captions and staggered fade-in.
- **Category filtering** — Nature / People / Wildlife / Lifestyle (configurable in `photos.json`).
- **Lightbox** — fullscreen viewer with crossfade, arrow-key navigation, counters, and a
  download button.
- **About page** — the photographer's story, with social links.
- **Light mode** — a warm light-brown theme (`#f4ead8`), toggled from the nav (☀/☾) and
  remembered across visits; the 3D hero adapts to it.
- **Smooth scroll** — [Lenis](https://github.com/darkroomengineering/lenis) + reveal-on-scroll +
  per-image parallax, plus a subtle animated film-grain overlay.
- **Contact page** — details list plus a form that opens WhatsApp with the message pre-filled.
- **SEO** — meta description, Open Graph tags, and schema.org JSON-LD.
- **Studio (admin)** — password-gated uploader: select photos, set a title and category,
  hit **Post**, and they are written straight into the project folder (full image +
  auto-generated thumbnail + manifest entry). Posted photos are browsed in a 3D tube viewer
  (rotate with the ◀/▶ buttons on its sides, or click a side face to spin it to the front,
  and click the front photo to zoom it) with an edit panel to change the title, category,
  description, or featured flag, or delete the photo.

---

## Tech stack

| What      | Where                                             |
| --------- | ------------------------------------------------- |
| Framework | React 18 + Vite 5                                 |
| 3D        | Three.js via @react-three/fiber                   |
| Routing   | react-router-dom (hash-based, host-agnostic)      |
| Scroll    | Lenis                                             |
| Fonts     | Cormorant Garamond + Inter (Google Fonts)         |

---

## Getting started

Requirements: **Node 18+** (tested on Node 24).

```bash
npm install     # install dependencies
npm run dev     # start the dev server -> http://localhost:5173
```

Build & preview the production bundle:

```bash
npm run build   # outputs to dist/
npm run serve   # serve the built site + upload API on http://localhost:3000
```

The build itself is fully static — deploy `dist/` to any static host (Netlify, Vercel,
GitHub Pages, nginx, S3, …). The `base: './'` config and hash-based routing mean it also
works from a sub-path or opened straight from disk. Only the **Studio uploads** need the
local API; on a purely static host the site keeps working but the studio falls back to
read-only mode.

---

## Photos

The repo ships with **51 photos from the Uncloptics portfolio**, organized into the four
collections used on the live site:

```
public/photos/       full-size images   (p01.jpg … p51.jpg)
public/thumbnails/   grid/lightbox      (t01.jpg … t51.jpg)
src/data/photos.json photo metadata + categories (Nature, People, Wildlife, Lifestyle)
```

They were pulled from the photographer's Pixieset site with `scripts/pull-pixieset.mjs`
(re-runnable if the source galleries change). The old Unsplash demo set can be restored
with `npm run photos` (`scripts/fetch-demo.mjs`), which rewrites the manifest and files.

---

## Using the Studio (admin)

> **Admin password: `lumiere`**

The studio posts photos **directly into the project** through a small local API
(`server/api.mjs`). Start the dev server (`npm run dev`) or production server
(`npm run serve`) so the API is available, then:

1. Go to `/#/admin` (link in the nav: **Studio**).
2. Sign in with the password **`lumiere`** (see _Customization_ to change it).
3. Drag & drop images (jpg / png / webp) or click to browse — each becomes a pending item
   in the list.
4. Edit each item's **title** and **category**; remove any you don't want.
5. Click **Post** — photos are written to `public/photos/`, a compressed thumbnail is
   generated into `public/thumbnails/`, and the manifest `src/data/photos.json` is updated
   in one go.
6. Posted photos appear in a **3D tube viewer** on the left — the ◀/▶ buttons flank its
   middle, or click a side face to spin that photo to the front; rapid clicks queue up and
   rotate through quickly. Click the **front photo to zoom** it, and the front photo pops
   forward as each new one lands at the front. Arrow keys work too, and the counter below
   shows the current position.
7. The panel on the right edits the **currently rotated photo**: change its **title**,
   **category**, add a **description** (shown in the site's lightbox), or toggle **Featured**
   (the site's featured picks), then click **Save changes** to write it to the manifest.
   **Delete photo** removes it and its files. Reload the page to see new photos in the gallery.

> If the API is unreachable (plain static hosting), the studio shows a notice and the
> **Post** buttons are disabled — the gallery still works from the bundled manifest.

---

## Project structure

```
├── index.html
├── vite.config.js
├── server/
│   ├── api.mjs            # local upload API (GET/POST/DELETE /api/photos)
│   ├── vite-plugin.mjs    # mounts the API into vite dev & preview
│   └── index.mjs          # standalone production server (npm run serve)
├── public/
│   ├── photos/          # full-size images
│   └── thumbnails/      # compressed grid images
├── scripts/
│   ├── fetch-demo.mjs   # download the Unsplash demo photos + manifest
│   ├── pull-pixieset.mjs# pull the Uncloptics photos from Pixieset (needs TEMP lists)
│   ├── smoke.mjs        # headless end-to-end test (dev) — posts & cleans up uploads
│   ├── prodcheck.mjs    # headless test against the production build
│   └── screenshots.mjs  # capture page screenshots
└── src/
    ├── main.jsx         # entry + router
    ├── App.jsx          # layout, routes, lenis init
    ├── index.css        # full theme (tokens, components, responsive)
    ├── data/photos.json # photo manifest
    ├── data/site.js     # brand, bio, contact + socials (edit here)
    ├── lib/scroll.js    # Lenis singleton + scroll helpers
    ├── hooks/usePhotos.js
    ├── components/      Nav, Footer, HeroScene, Gallery, CategoryTiles,
    │                    Lightbox, ParallaxImage, Reveal, AdminGallery
    └── pages/           Home, PortfolioPage, CategoryPage, AboutPage,
                         ContactPage, AdminPage
```

---

## Customization

All styling lives in `src/index.css` under CSS variables at the top:

```css
:root {
  --bg: #08080b;      /* page background   */
  --accent: #c9a96a;  /* gold accent color */
  --ink: #eae7e0;     /* text color        */
}
```

Other common edits:

- **Brand, bio, contact & socials** — `src/data/site.js` (site name, photographer,
  tagline, bio, Instagram, WhatsApp, phone). Update here, not per-page.
- **Contact details** — `src/data/site.js`, rendered on the contact page and in the footer.
- **Categories & featured photos** — edit `src/data/photos.json`
  (`"featured": true` picks the photos shown in the hero).
- **Admin password** — computed as a SHA-256 hash stored in
  `src/pages/AdminPage.jsx` (`ADMIN_HASH`). Generate a new hash with:

  ```bash
  node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
  ```

---

## Tests

The project ships with headless Edge/Chrome smoke tests (uses `puppeteer-core`):

```bash
npm run smoke      # dev-server E2E: hero, gallery, filters, lightbox, contact, studio, post & delete uploads
npm run prodcheck  # verifies the production build serves correctly (all images load)
```

Both exit non-zero on any console/page error and print a list of issues.

> The smoke test performs real uploads via the API and deletes them again afterwards,
> restoring the demo manifest — the repo stays clean.

---

## License

The app code is free to use. The bundled demo photographs are for demonstration only —
replace them with the photographer's own work before public launch.
