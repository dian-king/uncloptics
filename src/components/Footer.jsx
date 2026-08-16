import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { site } from '../data/site'

const STUDIO_ROUTE = '/studio-vault'

export default function Footer() {
  const navigate = useNavigate()
  const clicks = useRef(0)
  const clickTimer = useRef(null)

  const onLogoClick = (e) => {
    clicks.current += 1
    clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => { clicks.current = 0 }, 600)
    if (clicks.current >= 5) {
      clicks.current = 0
      e.preventDefault()
      navigate(STUDIO_ROUTE)
    }
  }

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Link to="/" className="nav-logo" onClick={onLogoClick}>
          {site.name}<span className="dot">.</span>
        </Link>
        <div className="footer-social">
          <a href={site.instagram} target="_blank" rel="noreferrer">Instagram</a>
          <a href={site.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
        </div>
        <span className="footer-note">© {new Date().getFullYear()} {site.name} — all rights reserved</span>
      </div>
    </footer>
  )
}
