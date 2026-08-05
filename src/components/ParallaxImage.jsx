import { useEffect, useRef } from 'react'

export default function ParallaxImage({ src, alt, speed = 0.12, className = '' }) {
  const outer = useRef(null)
  const inner = useRef(null)

  useEffect(() => {
    const el = outer.current
    const img = inner.current
    if (!el || !img) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      if (rect.bottom < -80 || rect.top > vh + 80) return
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2)
      const shift = -progress * speed * rect.height
      img.style.transform = `translateY(${shift.toFixed(1)}px) scale(1.18)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [speed])

  return (
    <div className={`parallax ${className}`.trim()} ref={outer}>
      <img ref={inner} src={src} alt={alt} loading="lazy" draggable={false} />
    </div>
  )
}
