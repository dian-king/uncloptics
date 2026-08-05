import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Lightbox from './Lightbox'

const base = import.meta.env.BASE_URL
const API = `${base}api/photos`

const EMPTY = { title: '', category: '', description: '', featured: false }
const STEP = 60
// Faster base spin, shorter still when more steps are queued (rapid clicks stay snappy).
const DUR = 420
const DUR_CHAINED = 300
// Tube radius (distance from center to each face plane) and the chord width each
// panel needs to tile the hexagon edge-to-edge without cutting into its neighbours.
const RADIUS = 220
const WIDTH = 2 * RADIUS * Math.tan((STEP / 2) * (Math.PI / 180))
const FACES = [
  { a: 0, offset: 0 },
  { a: 60, offset: 1 },
  { a: 120, offset: 2 },
  { a: 180, offset: 3 },
  { a: 240, offset: -2 },
  { a: 300, offset: -1 },
]

function DrumFace({ photo, angle, depth, width, onFaceClick, imgKey }) {
  const front = Math.round(Math.abs(angle) / STEP) === 0
  return (
    <div
      className={`drum-face df-${Math.round(Math.abs(angle) / STEP)}`}
      style={{ '--a': `${angle}deg`, '--r': `${depth}px`, '--w': `${width}px` }}
      onClick={onFaceClick}
      role={front ? 'button' : undefined}
      aria-label={front ? 'Zoom into this photo' : undefined}
    >
      <img
        key={imgKey}
        src={`${base}${photo.thumb}`}
        alt={photo.alt}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      <figcaption className="drum-caption">
        <span className="drum-title">{photo.title}</span>
        <span className="drum-cat">{photo.category}</span>
      </figcaption>
    </div>
  )
}

export default function AdminGallery({ photos, deletingId, onDelete, onRefresh, categories }) {
  const [idx, setIdx] = useState(0)
  const [zoomIndex, setZoomIndex] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const spinning = useRef(false)
  const queue = useRef([])
  const spinFrame = useRef(0)
  const drumRef = useRef(null)

  const count = photos.length
  const selected = count ? photos[Math.min(idx, count - 1)] : null

  useEffect(() => {
    if (count && idx >= count) setIdx(count - 1)
  }, [count])

  const faces = useMemo(() => {
    if (!count) return []
    return FACES.map((f) => ({
      angle: f.a,
      offset: f.offset,
      photo: photos[(idx + f.offset + count) % count],
    }))
  }, [idx, photos, count])

  const pump = () => {
    if (spinning.current || queue.current.length === 0 || count === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let delta = 0
      while (queue.current.length) delta += queue.current.shift()
      setIdx((i) => (i + delta + count * 4) % count)
      return
    }
    const drum = drumRef.current
    if (!drum) return
    const dir = queue.current.shift()
    const dur = queue.current.length > 0 ? DUR_CHAINED : DUR
    spinning.current = true
    const start = performance.now()
    const to = -dir * STEP
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      drum.style.transform = `rotateY(${(to * eased).toFixed(2)}deg)`
      if (t < 1) {
        spinFrame.current = requestAnimationFrame(tick)
      } else {
        spinning.current = false
        flushSync(() => setIdx((i) => (i + dir + count) % count))
        drum.style.transform = ''
        pump()
      }
    }
    cancelAnimationFrame(spinFrame.current)
    spinFrame.current = requestAnimationFrame(tick)
  }

  const spin = (dir, steps = 1) => {
    if (count === 0) return
    for (let i = 0; i < steps; i++) queue.current.push(dir)
    pump()
  }

  useEffect(() => () => cancelAnimationFrame(spinFrame.current), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); spin(1) }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); spin(-1) }
    }
    if (zoomIndex !== null) return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, zoomIndex])

  useEffect(() => {
    if (!confirmDelete) return
    const onKey = (e) => {
      if (e.key === 'Escape') setConfirmDelete(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmDelete])

  useEffect(() => {
    setDraft(selected ? {
      title: selected.title || '',
      category: selected.category || '',
      description: selected.description || '',
      featured: !!selected.featured,
    } : EMPTY)
    setSaved(false)
    setSaveError('')
  }, [selected?.id])

  if (count === 0) {
    return (
      <div className="admin-gallery" data-count="0" data-selected="">
        <div className="admin-export">
          <h4>Nothing on the site yet</h4>
          <p className="form-note" style={{ marginTop: 8 }}>
            Upload photos above and hit Post — they'll appear here.
          </p>
        </div>
      </div>
    )
  }

  const dirty = !!selected && (
    draft.title !== (selected.title || '') ||
    draft.category !== (selected.category || '') ||
    draft.description !== (selected.description || '') ||
    draft.featured !== !!selected.featured
  )

  const save = async () => {
    if (!selected || !dirty || saving) return
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      const res = await fetch(`${API}/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      setSaved(true)
      await onRefresh()
    } catch {
      setSaveError('Could not save — is the server running?')
    }
    setSaving(false)
  }

  const faceClick = (offset) => {
    if (offset === 0) {
      if (!spinning.current) setZoomIndex(idx)
    } else {
      spin(offset > 0 ? 1 : -1, Math.abs(offset))
    }
  }

  return (
    <div
      className="admin-gallery"
      data-count={count}
      data-selected={selected.id}
      data-saved={saved ? '1' : '0'}
    >
      <div className="drum-pane">
        <div className="drum-stage">
          <span className="drum-rim" aria-hidden="true" />
          <button
            className="drum-nav drum-prev"
            onClick={() => spin(-1)}
            aria-label="Previous photo"
            title="Previous (←)"
          >
            ◀
          </button>
          <div
            ref={drumRef}
            className="drum"
            role="button"
            aria-label="Posted photos on a rotating tube; click the front image to zoom"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !spinning.current) {
                e.preventDefault()
                setZoomIndex(idx)
              }
            }}
          >
            {faces.map((f) => (
              <DrumFace
                key={f.angle}
                photo={f.photo}
                angle={f.angle}
                depth={RADIUS}
                width={WIDTH}
                imgKey={f.offset === 0 ? 'front' : `side:${f.angle}`}
                onFaceClick={() => faceClick(f.offset)}
              />
            ))}
          </div>
          <button
            className="drum-nav drum-next"
            onClick={() => spin(1)}
            aria-label="Next photo"
            title="Next (→)"
          >
            ▶
          </button>
        </div>
        <div className="drum-count">
          {String(Math.min(idx, count - 1) + 1).padStart(2, '0')} <em>/</em> {String(count).padStart(2, '0')}
        </div>
      </div>

      <div className="admin-edit">
        <p className="eyebrow">Editing</p>
        <h4 className="admin-edit-title">{selected.title}</h4>

        <div className="admin-edit-fields">
          <label className="field">
            <span>Title</span>
            <input
              className="admin-edit-input admin-edit-name"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <input
              className="admin-edit-input admin-edit-cat"
              value={draft.category}
              list="category-options"
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              className="admin-edit-input admin-edit-desc"
              rows={3}
              value={draft.description}
              placeholder="A line about this photo…"
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <label className="admin-switch">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
            />
            <span className="switch-track" />
            <span className="switch-label">Featured on the site</span>
          </label>
        </div>

        <div className="admin-edit-actions">
          <button className="btn admin-save" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            className="btn danger admin-edit-del"
            onClick={() => setConfirmDelete(selected)}
            disabled={deletingId === selected.id}
          >
            {deletingId === selected.id ? 'Deleting…' : 'Delete photo'}
          </button>
        </div>

        {saved && <p className="form-note" style={{ marginTop: 12, color: 'var(--accent)' }}>Saved ✓</p>}
        {saveError && <p className="login-error" style={{ marginTop: 12 }}>{saveError}</p>}
        {dirty && !saving && !saved && (
          <p className="form-note" style={{ marginTop: 12 }}>Unsaved changes</p>
        )}
      </div>

      {confirmDelete && (
        <div
          className="confirm-backdrop"
          onClick={() => setConfirmDelete(null)}
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm deleting this photo"
        >
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">Delete photo</p>
            <h4 className="confirm-title">Are you sure?</h4>
            <p className="confirm-note">
              <strong>“{confirmDelete.title}”</strong> will be removed from the site and its
              files deleted. This can't be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn secondary confirm-cancel" onClick={() => setConfirmDelete(null)}>
                Keep it
              </button>
              <button
                className="btn danger confirm-delete"
                onClick={() => {
                  const photo = confirmDelete
                  setConfirmDelete(null)
                  onDelete(photo)
                }}
              >
                Delete photo
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomIndex !== null && (
        <Lightbox
          photos={photos}
          index={zoomIndex}
          onClose={() => setZoomIndex(null)}
          onNav={setZoomIndex}
        />
      )}
    </div>
  )
}
