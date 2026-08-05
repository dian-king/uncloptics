import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { scrollToTarget } from '../lib/scroll'
import { site } from '../data/site'
import { getTheme, toggleTheme } from '../lib/theme'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [light, setLight] = useState(() => getTheme() === 'light')
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goWork = (e) => {
    e.preventDefault()
    if (pathname === '/') {
      scrollToTarget('#work')
    } else {
      navigate('/', { state: { scrollTo: 'work' } })
    }
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
            onClick={() => { toggleTheme(); setLight(getTheme() === 'light') }}
            aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
            title={light ? 'Dark mode' : 'Light mode'}
          >
            {light ? '☾' : '☀'}
          </button>
          <Link to="/admin" className="admin-link">Studio</Link>
        </nav>
      </div>
    </header>
  )
}
