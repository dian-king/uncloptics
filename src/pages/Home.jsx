import { lazy, Suspense, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Gallery from '../components/Gallery'
import CategoryTiles from '../components/CategoryTiles'
import ParallaxImage from '../components/ParallaxImage'
import Reveal from '../components/Reveal'
import { scrollToTarget } from '../lib/scroll'
import { site } from '../data/site'
import { usePhotos } from '../hooks/usePhotos'

const HeroScene = lazy(() => import('../components/HeroScene'))

export default function Home() {
  const location = useLocation()
  const { photos } = usePhotos()
  const base = import.meta.env.BASE_URL
  const portrait = photos.find((p) => p.category === 'People' && p.featured) || photos.find((p) => p.category === 'People')

  useEffect(() => {
    if (location.state?.scrollTo === 'work') {
      const t = setTimeout(() => scrollToTarget('#work'), 350)
      return () => clearTimeout(t)
    }
  }, [location.state])

  return (
    <>
      <section className="hero">
        <Suspense fallback={<div className="hero-canvas" style={{ background: 'var(--bg)' }} />}>
          <HeroScene />
        </Suspense>
        <div className="hero-overlay">
          <h1 className="hero-title">{site.name}</h1>
          <p className="hero-tag">{site.tagline}</p>
          <a href="#categories" className="btn hero-cta" onClick={(e) => { e.preventDefault(); scrollToTarget('#categories'); }}>
            Explore <span className="btn-arrow">↓</span>
          </a>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <span>Scroll</span>
          <span className="line" />
        </div>
      </section>

      <CategoryTiles />

      <section className="intro">
        <div className="container intro-grid">
          <Reveal className="intro-text">
            <p className="eyebrow">About</p>
            <h2>
              {site.tagline.split(' soulful ')[0]} <em>soulful imagery.</em>
            </h2>
            <p>{site.bio}</p>
            <p className="signature">— {site.photographer}</p>
            <Link to="/about" className="link-accent" style={{ display: 'inline-block', marginTop: 26 }}>
              Learn more →
            </Link>
          </Reveal>
          {portrait && (
            <Reveal className="intro-media" delay={120}>
              <ParallaxImage
                src={`${base}${portrait.thumb}`}
                alt={portrait.alt}
                speed={0.16}
              />
            </Reveal>
          )}
        </div>
      </section>

      <Gallery />

      <section className="cta">
        <div className="container cta-inner">
          <Reveal>
            <p className="eyebrow">Moments framed in time</p>
            <h2 className="serif display">Let's document</h2>
            <Link to="/contact" className="btn">Contact me <span className="btn-arrow">→</span></Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
