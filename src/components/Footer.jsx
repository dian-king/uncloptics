import { Link } from 'react-router-dom'
import { site } from '../data/site'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Link to="/" className="nav-logo">
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
