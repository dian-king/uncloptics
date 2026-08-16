import { useState } from 'react'
import { apiFetch } from '../lib/api'

export default function AdminCollections({ categories, featuredCategories, photos, onChanged }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)

  const countFor = (cat) => photos.filter((p) => p.category === cat).length
  const fallbackFor = (cat) => categories.find((c) => c !== cat) || 'Portraits'

  const addCollection = async (e) => {
    e.preventDefault()
    const value = name.trim()
    if (!value || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await apiFetch('api/collections', {
        method: 'POST',
        body: { name: value },
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      setName('')
      await onChanged()
    } catch {
      setError('Could not add the collection — is the server running?')
    }
    setBusy(false)
  }

  const toggleFeatured = async (cat, featured) => {
    setError('')
    try {
      const res = await apiFetch(`api/collections/${encodeURIComponent(cat)}`, {
        method: 'PATCH',
        body: { featured },
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      await onChanged()
    } catch {
      setError('Could not update the collection — is the server running?')
    }
  }

  const doDelete = async () => {
    const cat = confirm
    setConfirm(null)
    setError('')
    try {
      const res = await apiFetch(`api/collections/${encodeURIComponent(cat)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`api ${res.status}`)
      await onChanged()
    } catch {
      setError('Could not delete the collection — is the server running?')
    }
  }

  const sorted = [...categories].sort((a, b) => {
    const fa = featuredCategories.includes(a) ? 0 : 1
    const fb = featuredCategories.includes(b) ? 0 : 1
    return fa - fb
  })

  return (
    <section className="admin-collections">
      <div className="admin-collections-head">
        <p className="eyebrow">Collections</p>
        <h4 className="admin-edit-title">Manage collections</h4>
        <p className="form-note" style={{ marginTop: 6 }}>
          Add or remove collections, and pick which ones are featured on the site.
        </p>
      </div>

      <form className="ac-add" onSubmit={addCollection}>
        <input
          className="ac-name-input"
          value={name}
          placeholder="New collection name"
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" disabled={busy || !name.trim()}>
          {busy ? 'Adding…' : 'Add collection'}
        </button>
      </form>

      {error && <p className="login-error" style={{ marginTop: 12 }}>{error}</p>}

      <div className="admin-list">
        {sorted.map((cat) => (
          <div className="ac-item" key={cat}>
            <div className="ac-info">
              <span className="ac-name">{cat}</span>
              <span className="ac-meta">
                {countFor(cat)} {countFor(cat) === 1 ? 'photo' : 'photos'}
              </span>
            </div>
            <label className="admin-switch ac-switch" title="Featured collection">
              <input
                type="checkbox"
                checked={featuredCategories.includes(cat)}
                onChange={(e) => toggleFeatured(cat, e.target.checked)}
              />
              <span className="switch-track" />
              <span className="switch-label">Featured</span>
            </label>
            <button
              className="ai-remove"
              onClick={() => setConfirm(cat)}
              aria-label={`Delete ${cat}`}
              title={`Delete ${cat}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {confirm && (
        <div
          className="confirm-backdrop"
          onClick={() => setConfirm(null)}
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm deleting this collection"
        >
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">Delete collection</p>
            <h4 className="confirm-title">Are you sure?</h4>
            <p className="confirm-note">
              <strong>“{confirm}”</strong> will be removed as a collection. Its{' '}
              {countFor(confirm)} {countFor(confirm) === 1 ? 'photo' : 'photos'} will move to{' '}
              <strong>“{fallbackFor(confirm)}”</strong>.
            </p>
            <div className="confirm-actions">
              <button className="btn secondary confirm-cancel" onClick={() => setConfirm(null)}>
                Keep it
              </button>
              <button className="btn danger confirm-delete" onClick={doDelete}>
                Delete collection
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
