import { useState } from 'react'
import Reveal from '../components/Reveal'
import { site } from '../data/site'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', message: '' })

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = (e) => {
    e.preventDefault()
    const text = encodeURIComponent(`Hi ${site.name}, ${form.message} — ${form.name}`)
    window.open(`${site.whatsapp}?text=${text}`, '_blank')
    setSent(true)
  }

  return (
    <div className="page container">
      <Reveal className="page-head">
        <p className="eyebrow">Contact</p>
        <h1 className="serif display">
          Moments framed in time — <span className="italic" style={{ color: 'var(--accent)' }}>let's document.</span>
        </h1>
        <p className="page-sub">
          Booking a session, commissioning work, or licensing an image — this is the place.
        </p>
      </Reveal>

      <div className="contact-grid">
        <Reveal className="contact-side" delay={100}>
          <p>
            I'm based in {site.location} and available for commissions near and far.
            Fastest replies on WhatsApp and Instagram.
          </p>
          <ul className="contact-list">
            <li>
              <span className="k">Instagram</span>
              <a className="v" href={site.instagram} target="_blank" rel="noreferrer">{site.instagramHandle}</a>
            </li>
            <li>
              <span className="k">Phone</span>
              <a className="v" href={`tel:${site.phoneHref}`}>{site.phone}</a>
            </li>
            <li>
              <span className="k">WhatsApp</span>
              <a className="v" href={site.whatsapp} target="_blank" rel="noreferrer">Message me</a>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={180}>
          {sent ? (
            <div className="form-thanks">Thank you — opening WhatsApp. I'll be in touch soon.</div>
          ) : (
            <form className="form" onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" required value={form.name} onChange={onChange} />
              </div>
              <div className="field">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" rows="5" required value={form.message} onChange={onChange} />
              </div>
              <button type="submit" className="btn">
                Send via WhatsApp <span className="btn-arrow">→</span>
              </button>
              <p className="form-note">This opens WhatsApp with the message pre-filled.</p>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  )
}
