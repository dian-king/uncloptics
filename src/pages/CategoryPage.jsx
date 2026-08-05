import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePhotos } from '../hooks/usePhotos'
import Reveal from '../components/Reveal'
import ParallaxImage from '../components/ParallaxImage'
import Lightbox from '../components/Lightbox'

export default function CategoryPage() {
  const { category } = useParams()
  const { photos, categories } = usePhotos()
  const [active, setActive] = useState(null)
  const base = import.meta.env.BASE_URL

  const list = photos.filter((p) => p.category === category)
  const title = categories.find((c) => c === category) || category

  if (list.length === 0) {
    return (
      <div className="page container">
        <Reveal className="page-head">
          <p className="eyebrow">Portfolio</p>
          <h1 className="serif display">Nothing here yet.</h1>
          <p className="page-sub">
            <Link to="/portfolio" className="link-accent">← Back to portfolio</Link>
          </p>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="page container">
      <Reveal className="page-head">
        <p className="eyebrow">Portfolio</p>
        <h1 className="serif display">{title}</h1>
        <p className="page-sub">
          <Link to="/portfolio" className="link-accent">← All collections</Link>
          <span className="page-sub-count">{list.length} {list.length === 1 ? 'photo' : 'photos'}</span>
        </p>
      </Reveal>

      <div className="masonry">
        {list.map((p, i) => (
          <figure key={p.id} className="tile" style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }} onClick={() => setActive(i)} onContextMenu={(e) => e.preventDefault()}>
            <ParallaxImage src={`${base}${p.thumb}`} alt={p.alt} speed={0.1} />
            <figcaption>
              <span className="tile-title">{p.title}</span>
              <span className="tile-cat">{p.category}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {active !== null && (
        <Lightbox photos={list} index={active} onClose={() => setActive(null)} onNav={setActive} />
      )}
    </div>
  )
}
