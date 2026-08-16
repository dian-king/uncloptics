import { useState } from 'react'
import { usePhotos } from '../hooks/usePhotos'
import Reveal from './Reveal'
import ParallaxImage from './ParallaxImage'
import Lightbox from './Lightbox'
import { photoUrl } from '../lib/photoUrl'

export default function Gallery() {
  const { photos, categories } = usePhotos()
  const [filter, setFilter] = useState('All')
  const [active, setActive] = useState(null)

  const filtered = filter === 'All' ? photos : photos.filter((p) => p.category === filter)

  return (
    <section id="work" className="gallery-section">
      <div className="container">
        <Reveal className="gallery-head">
          <p className="eyebrow">Selected works</p>
          <h2 className="serif display">Moments framed in time</h2>
          <div className="filters">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                className={`filter-btn ${filter === c ? 'active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>

        <div key={filter} className="masonry">
          {filtered.map((p, i) => (
            <figure
              key={p.id}
              className="tile"
              style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(i)
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Open ${p.title}`}
            >
              <ParallaxImage src={photoUrl(p.thumb)} alt={p.alt} speed={0.1} />
              <figcaption>
                <span className="tile-title">{p.title}</span>
                <span className="tile-cat">{p.category}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {active !== null && (
        <Lightbox photos={filtered} index={active} onClose={() => setActive(null)} onNav={setActive} />
      )}
    </section>
  )
}
