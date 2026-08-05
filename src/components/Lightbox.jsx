import { useEffect, useState } from 'react'
import { stopScroll, startScroll } from '../lib/scroll'

export default function Lightbox({ photos, index, onClose, onNav }) {
  const photo = photos[index]
  const [loaded, setLoaded] = useState(false)
  const base = import.meta.env.BASE_URL

  const prev = () => {
    setLoaded(false)
    onNav((index - 1 + photos.length) % photos.length)
  }
  const next = () => {
    setLoaded(false)
    onNav((index + 1) % photos.length)
  }

  useEffect(() => {
    setLoaded(false)
    stopScroll()
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      startScroll()
    }
  }, [index, photos.length])

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {!loaded && (
          <div className="lightbox-loader">
            <div className="spinner" />
          </div>
        )}
        <img
          key={photo.id}
          className="lightbox-image"
          src={base + photo.url}
          alt={photo.alt}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.45s ease' }}
        />
        <a
          className="lightbox-dl"
          href={base + photo.url}
          download={photo.alt}
          target="_blank"
          rel="noreferrer"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          ⤓
        </a>
        <div className="lightbox-meta">
          <span className="title">{photo.title}</span>
          <span className="cat">{photo.category}</span>
          {photo.description && <p className="lightbox-desc">{photo.description}</p>}
          <span className="count">
            {index + 1} / {photos.length}
          </span>
        </div>
      </div>

      {photos.length > 1 && (
        <>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">
            ‹
          </button>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">
            ›
          </button>
        </>
      )}
    </div>
  )
}
