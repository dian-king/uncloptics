import Lenis from 'lenis'

let lenis = null
let rafId = 0

export function initLenis() {
  if (lenis) return lenis
  lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  })
  const raf = (time) => {
    lenis.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)
  return lenis
}

export function getLenis() {
  return lenis
}

export function destroyLenis() {
  if (rafId) cancelAnimationFrame(rafId)
  if (lenis) {
    lenis.destroy()
    lenis = null
  }
}

export function stopScroll() {
  lenis?.stop()
}

export function startScroll() {
  lenis?.start()
}

export function scrollToTarget(target) {
  if (lenis) {
    lenis.scrollTo(target, { offset: -72, duration: 1.4 })
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView({ behavior: 'smooth' })
  }
}

export function scrollToTop(immediate = true) {
  if (lenis) {
    lenis.scrollTo(0, { immediate })
  } else {
    window.scrollTo(0, 0)
  }
}
