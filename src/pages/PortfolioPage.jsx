import { Link } from 'react-router-dom'
import { usePhotos } from '../hooks/usePhotos'
import Reveal from '../components/Reveal'
import ParallaxImage from '../components/ParallaxImage'

export default function PortfolioPage() {
  const { photos, categories, featuredCategories } = usePhotos()
  const base = import.meta.env.BASE_URL

  const ordered = [...categories].sort((a, b) => {
    const fa = featuredCategories.includes(a) ? 0 : 1
    const fb = featuredCategories.includes(b) ? 0 : 1
    return fa - fb
  })

  const covers = ordered.map((cat) => ({
    category: cat,
    photo: photos.find((p) => p.category === cat),
    count: photos.filter((p) => p.category === cat).length,
    featured: featuredCategories.includes(cat),
  }))

  return (
    <div className="page container">
      <Reveal className="page-head">
        <p className="eyebrow">Portfolio</p>
        <h1 className="serif display">
          Collections, <span className="italic" style={{ color: 'var(--accent)' }}>framed in time.</span>
        </h1>
        <p className="page-sub">
          {categories.length} {categories.length === 1 ? 'body' : 'bodies'} of work — {categories.join(', ').toLowerCase()}.
        </p>
      </Reveal>

      <div className="cat-grid">
        {covers.map(({ category, photo, count, featured }, i) => (
          <Reveal key={category} delay={i * 90} className="cat-card-wrap">
            <Link to={`/portfolio/${encodeURIComponent(category)}`} className="cat-card">
              {photo && (
                <ParallaxImage src={`${base}${photo.thumb}`} alt={photo.alt} speed={0.12} />
              )}
              <div className="cat-card-overlay">
                {featured && <span className="cat-badge">Featured</span>}
                <h2 className="serif">{category}</h2>
                <span className="cat-card-meta">
                  {count} {count === 1 ? 'photo' : 'photos'} · Explore →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
