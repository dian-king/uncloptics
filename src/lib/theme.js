const KEY = 'uncloptics:theme'
const listeners = new Set()

function initial() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'dark'
}

let current = initial()

function apply(t) {
  current = t
  try {
    localStorage.setItem(KEY, t)
  } catch {}
  if (t === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
  listeners.forEach((fn) => fn(t))
}

export function getTheme() {
  return current
}

export function setTheme(t) {
  if (t !== current) apply(t)
}

export function toggleTheme() {
  apply(current === 'light' ? 'dark' : 'light')
}

export function subscribeTheme(fn) {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}

apply(current)
