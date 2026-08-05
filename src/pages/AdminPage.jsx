import { useEffect, useMemo, useRef, useState } from 'react'
import { usePhotos } from '../hooks/usePhotos'
import Reveal from '../components/Reveal'
import AdminGallery from '../components/AdminGallery'
import AdminCollections from '../components/AdminCollections'
import { loadPending, savePending, clearPending } from '../lib/pendingStore'
import { site } from '../data/site'

const ADMIN_HASH = 'c905fb6e3bdbad92354471ca90e7ad180dab721f6e095225c82c0f34c7409bdc'
const AUTH_KEY = 'lumiere:auth'
const API = `${import.meta.env.BASE_URL}api/photos`

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'photo'
}

function Login({ onAuthed }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const hash = await sha256(pw)
    if (hash === ADMIN_HASH) {
      sessionStorage.setItem(AUTH_KEY, '1')
      onAuthed()
    } else {
      setError('That password is not correct.')
    }
    setBusy(false)
  }

  return (
    <div className="login-card">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="pw">Studio password</label>
          <input id="pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="btn" disabled={busy || !pw}>
          Enter studio
        </button>
        <p className="form-note">Demo password: <code style={{ color: 'var(--accent)' }}>lumiere</code></p>
      </form>
    </div>
  )
}

export default function AdminPage() {
  const { photos, categories, featuredCategories, serverOk, refresh } = usePhotos()
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1')
  const [pending, setPending] = useState([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const inputRef = useRef(null)
  const hydrated = useRef(false)

  useEffect(() => {
    loadPending().then((items) => {
      hydrated.current = true
      if (items.length) {
        setPending(
          items.map((it) => ({
            id: it.id,
            title: it.title,
            category: it.category,
            file: it.file,
            preview: URL.createObjectURL(it.file),
          }))
        )
      }
    })
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    savePending(pending.map(({ id, title, category, file }) => ({ id, title, category, file })))
  }, [pending])

  const catOptions = useMemo(() => [...new Set([...site.categories, ...categories])], [categories])

  const addFiles = (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) {
      setError('Please choose image files (jpg, png, webp…).')
      return
    }
    setError('')
    setMessage('')
    const next = files.map((f) => ({
      id: slugify(f.name.replace(/\.[^.]+$/, '')),
      title: f.name.replace(/\.[^.]+$/, ''),
      category: site.categories[0],
      preview: URL.createObjectURL(f),
      file: f,
    }))
    setPending((prev) => [...prev, ...next])
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const updatePending = (id, patch) => {
    setPending((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const removePending = (id) => {
    setPending((prev) => {
      const target = prev.find((it) => it.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((it) => it.id !== id)
    })
  }

  const postAll = async () => {
    setPosting(true)
    setError('')
    setMessage('')
    let posted = 0
    let failed = 0
    for (const item of pending) {
      const fd = new FormData()
      fd.append('file', item.file)
      fd.append('title', item.title)
      fd.append('category', item.category)
      fd.append('alt', item.title)
      try {
        const res = await fetch(API, { method: 'POST', body: fd })
        if (res.ok) posted++
        else failed++
      } catch {
        failed++
      }
    }
    for (const it of pending) URL.revokeObjectURL(it.preview)
    setPending([])
    setPosting(false)
    await refresh()
    if (posted > 0) setMessage(`${posted} photo${posted === 1 ? '' : 's'} posted to the site.`)
    if (failed > 0) setError(`${failed} upload${failed === 1 ? '' : 's'} failed. Check the server console.`)
  }

  const removePhoto = async (photo) => {
    setDeletingId(photo.id)
    try {
      const res = await fetch(`${API}/${photo.id}`, { method: 'DELETE' })
      if (!res.ok) setError('Could not delete that photo.')
    } catch {
      setError('Delete failed — is the server running?')
    }
    setDeletingId(null)
    await refresh()
  }

  const logout = () => {
    clearPending()
    sessionStorage.removeItem(AUTH_KEY)
    setAuthed(false)
    setPending([])
  }

  return (
    <div className="page container admin-panel">
      <Reveal className="admin-head">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="serif display">Manage the work</h1>
          <p className="admin-note">
            Select photos, give them a title and category, then hit Post — they go straight into the gallery.
          </p>
        </div>
        {authed && (
          <button className="btn secondary" onClick={logout}>Sign out</button>
        )}
      </Reveal>

      {!authed ? (
        <Reveal>
          <Login onAuthed={() => setAuthed(true)} />
        </Reveal>
      ) : !serverOk ? (
        <Reveal className="admin-export">
          <h4>Server offline</h4>
          <p className="form-note" style={{ marginTop: 8 }}>
            The Studio needs the local server to write files into the project. Start it with{' '}
            <code style={{ color: 'var(--accent)' }}>npm run dev</code> (or{' '}
            <code style={{ color: 'var(--accent)' }}>npm run serve</code> after a build) and reload this page.
          </p>
        </Reveal>
      ) : (
        <Reveal>
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="dz-title">Drop photographs here</div>
            <div className="dz-sub">or click to browse · jpg, png, webp · they upload to the site</div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {error && <p className="login-error" style={{ marginTop: 14 }}>{error}</p>}
          {message && <p className="form-note" style={{ marginTop: 14, color: 'var(--accent)' }}>{message}</p>}

          {pending.length > 0 && (
            <>
              <div className="admin-list">
                {pending.map((it) => (
                  <div className="admin-item" key={it.id}>
                    <img src={it.preview} alt={it.title} />
                    <div className="ai-fields">
                      <input
                        className="ai-title"
                        value={it.title}
                        placeholder="Title"
                        onChange={(e) => updatePending(it.id, { title: e.target.value, id: slugify(e.target.value) })}
                      />
                      <input
                        className="ai-title"
                        value={it.category}
                        placeholder="Category"
                        list="category-options"
                        onChange={(e) => updatePending(it.id, { category: e.target.value })}
                      />
                    </div>
                    <button className="ai-remove" onClick={() => removePending(it.id)} aria-label="Remove" title="Remove">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="admin-actions">
                <button className="btn" onClick={postAll} disabled={posting}>
                  {posting ? 'Posting…' : `Post ${pending.length} to site`} <span className="btn-arrow">↑</span>
                </button>
                <button className="btn secondary" onClick={() => setPending([])} disabled={posting}>
                  Clear
                </button>
              </div>
            </>
          )}

          <datalist id="category-options">
            {catOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <AdminGallery
            photos={photos}
            categories={catOptions}
            deletingId={deletingId}
            onDelete={removePhoto}
            onRefresh={refresh}
          />

          <AdminCollections
            categories={categories}
            featuredCategories={featuredCategories}
            photos={photos}
            onChanged={refresh}
          />
        </Reveal>
      )}
    </div>
  )
}
