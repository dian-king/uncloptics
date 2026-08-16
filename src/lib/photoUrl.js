export function photoUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${import.meta.env.BASE_URL}${url}`
}
