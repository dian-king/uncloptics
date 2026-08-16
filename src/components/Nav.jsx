import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { scrollToTarget, stopScroll, startScroll } from '../lib/scroll'
import { site } from '../data/site'
import { getTheme, toggleTheme } from '../lib/theme'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [light, setLight] = useState(() => getTheme() === 'light')
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    stopScroll()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      startScroll()
    }
  }, [menuOpen])

  const goWork = (e) => {
    e.preventDefault()
    setMenuOpen(false)
    if (pathname === '/') {
      scrollToTarget('#work')
    } else {
      navigate('/', { state: { scrollTo: 'work' } })
    }
  }

  const flipTheme = () => {
    toggleTheme()
    setLight(getTheme() === 'light')
  }

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          {site.name}<span className="dot">.</span>
        </Link>
        <nav className="nav-links">
          <a href="/" className="work-link" onClick={goWork}>Work</a>
          <Link to="/portfolio" className={pathname === '/portfolio' ? 'active' : ''}>Portfolio</Link>
          <Link to="/about" className={pathname === '/about' ? 'active' : ''}>About</Link>
          <Link to="/contact" className={pathname === '/contact' ? 'active' : ''}>Contact</Link>
          <button
            className="theme-toggle"
            onClick={flipTheme}
            aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
            title={light ? 'Dark mode' : 'Light mode'}
          >
            {light ? '☾' : '☀'}
          </button>
        </nav>
        <button
          className={`nav-burger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/" className="nav-menu-link" onClick={goWork}>Work</a>
        <Link to="/portfolio" className="nav-menu-link">Portfolio</Link>
        <Link to="/about" className="nav-menu-link">About</Link>
        <Link to="/contact" className="nav-menu-link">Contact</Link>
        <button className="nav-menu-link nav-menu-theme" onClick={flipTheme}>
          {light ? '☾ Dark' : '☀ Light'}
        </button>
      </div>
    </header>
  )
}
