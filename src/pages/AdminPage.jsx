import { useEffect, useMemo, useRef, useState } from 'react'
import { usePhotos } from '../hooks/usePhotos'
import Reveal from '../components/Reveal'
import AdminGallery from '../components/AdminGallery'
import AdminCollections from '../components/AdminCollections'
import { loadPending, savePending, clearPending } from '../lib/pendingStore'
import { apiFetch, getToken, setToken, clearToken } from '../lib/api'
import { site } from '../data/site'

const API = 'api/photos'

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'photo'
}

function handleUploadUrl() {
  return new URL('api/upload-token', window.location.href).href
}

function Login({ onAuthed }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await apiFetch('api/auth', { method: 'POST', body: { password: pw } })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.token) {
        setToken(data.token)
        onAuthed()
      } else if (res.status === 429) {
        setError('Too many attempts — wait a few minutes, then try again.')
      } else if (res.status === 401) {
        setError('That password is not correct.')
      } else {
        setError('Something went wrong on the server — please try again.')
      }
    } catch {
      setError('Could not reach the server — is it running?')
    }
    setBusy(false)
  }

  return (
    <div className="login-card">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="pw">Studio password</label>
          <div className="pw-field">
            <input
              id="pw"
              type={show ? 'text' : 'password'}
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              title={show ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="btn" disabled={busy || !pw}>
          Enter studio
        </button>
      </form>
    </div>
  )
}

export default function AdminPage() {
  const { photos, categories, featuredCategories, serverOk, checked, refresh, uploadMode } = usePhotos()
  const [authed, setAuthed] = useState(() => !!getToken())
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
      try {
        if (uploadMode === 'blob') {
          const { upload } = await import('@vercel/blob/client')
          const ext = EXT_BY_MIME[item.file.type] || 'jpg'
          const pathname = `photos/${slugify(item.title)}-${Date.now()}.${ext}`
          const blob = await upload(pathname, item.file, {
            access: 'public',
            handleUploadUrl: handleUploadUrl(),
          })
          const res = await apiFetch(`${API}`, {
            method: 'POST',
            body: { url: blob.url, title: item.title, category: item.category, alt: item.title },
          })
          if (res.ok) posted++
          else failed++
        } else {
          const fd = new FormData()
          fd.append('file', item.file)
          fd.append('title', item.title)
          fd.append('category', item.category)
          fd.append('alt', item.title)
          const res = await apiFetch(`${API}`, { method: 'POST', body: fd })
          if (res.ok) posted++
          else failed++
        }
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
      const res = await apiFetch(`${API}/${photo.id}`, { method: 'DELETE' })
      if (!res.ok) setError('Could not delete that photo.')
    } catch {
      setError('Delete failed — is the server running?')
    }
    setDeletingId(null)
    await refresh()
  }

  const logout = () => {
    apiFetch('api/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    clearPending()
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
      </Reveal>

      {!authed ? (
        !checked ? (
          <Reveal>
            <p className="form-note" style={{ padding: '40px 0', textAlign: 'center' }}>Checking connection…</p>
          </Reveal>
        ) : serverOk ? (
          <Reveal>
            <Login onAuthed={() => setAuthed(true)} />
          </Reveal>
        ) : (
          <Reveal className="admin-export">
            <h4>Studio unavailable</h4>
            <p className="form-note" style={{ marginTop: 8 }}>
              The studio needs the site's API server, which isn't reachable from this host.
              Run it locally with{' '}
              <code style={{ color: 'var(--accent)' }}>npm run dev</code> (or{' '}
              <code style={{ color: 'var(--accent)' }}>npm run serve</code> after a build) to
              upload and manage photos.
            </p>
          </Reveal>
        )
      ) : (
        <Reveal>
          <div className="studio-toolbar">
            <span className="studio-status">
              <span className={`status-dot ${serverOk ? 'online' : ''}`} />
              Signed in{serverOk ? ' · server online' : ' · server unreachable'}
            </span>
            <button className="btn secondary" onClick={logout}>
              Sign out
            </button>
          </div>

          {checked && !serverOk && (
            <div className="admin-export">
              <h4>Server unreachable</h4>
              <p className="form-note" style={{ marginTop: 8 }}>
                Changes won't be saved until the site's API server is reachable. Run it locally
                with <code style={{ color: 'var(--accent)' }}>npm run dev</code> (or{' '}
                <code style={{ color: 'var(--accent)' }}>npm run serve</code> after a build).
              </p>
            </div>
          )}

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
