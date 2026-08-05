import Reveal from '../components/Reveal'
import ParallaxImage from '../components/ParallaxImage'
import { usePhotos } from '../hooks/usePhotos'
import { site } from '../data/site'

export default function AboutPage() {
  const { photos } = usePhotos()
  const base = import.meta.env.BASE_URL
  const portrait = photos.find((p) => p.category === 'People' && p.featured) || photos.find((p) => p.category === 'People')

  return (
    <div className="page container">
      <Reveal className="page-head">
        <p className="eyebrow">About</p>
        <h1 className="serif display">
          Rooted in the soil, <span className="italic" style={{ color: 'var(--accent)' }}>in love with art.</span>
        </h1>
      </Reveal>

      <div className="about-grid">
        <Reveal className="about-text" delay={100}>
          <p className="about-lead">{site.bio}</p>
          <p className="signature" style={{ marginTop: 34 }}>— {site.photographer}, {site.name}</p>
          <div className="about-actions">
            <a className="btn" href={site.instagram} target="_blank" rel="noreferrer">
              Follow {site.instagramHandle} <span className="btn-arrow">→</span>
            </a>
            <a className="btn secondary" href={site.whatsapp} target="_blank" rel="noreferrer">
              Get in touch
            </a>
          </div>
        </Reveal>
        {portrait && (
          <Reveal className="intro-media" delay={220}>
            <ParallaxImage src={`${base}${portrait.thumb}`} alt={portrait.alt} speed={0.16} />
          </Reveal>
        )}
      </div>
    </div>
  )
}
