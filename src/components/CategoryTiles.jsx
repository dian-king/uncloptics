import { Link } from 'react-router-dom'
import { usePhotos } from '../hooks/usePhotos'
import Reveal from './Reveal'
import ParallaxImage from './ParallaxImage'

export default function CategoryTiles({ onExplore }) {
  const { photos, categories, featuredCategories } = usePhotos()
  const base = import.meta.env.BASE_URL

  const ordered = [...categories].sort((a, b) => {
    const fa = featuredCategories.includes(a) ? 0 : 1
    const fb = featuredCategories.includes(b) ? 0 : 1
    return fa - fb
  })

  return (
    <section id="categories" className="cat-section">
      <div className="container">
        <Reveal className="cat-head">
          <p className="eyebrow">Explore</p>
          <h2 className="serif display">Collections</h2>
        </Reveal>
        <div className="cat-grid">
          {ordered.map((cat, i) => {
            const photo = photos.find((p) => p.category === cat)
            const count = photos.filter((p) => p.category === cat).length
            const featured = featuredCategories.includes(cat)
            return (
              <Reveal key={cat} delay={i * 90} className="cat-card-wrap">
                <Link
                  to={`/portfolio/${encodeURIComponent(cat)}`}
                  className="cat-card"
                  onClick={onExplore}
                >
                  {photo && <ParallaxImage src={`${base}${photo.thumb}`} alt={photo.alt} speed={0.12} />}
                  <div className="cat-card-overlay">
                    {featured && <span className="cat-badge">Featured</span>}
                    <h2 className="serif">{cat}</h2>
                    <span className="cat-card-meta">
                      {count} {count === 1 ? 'photo' : 'photos'} · Explore →
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
