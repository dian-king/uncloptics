import { useCallback, useEffect, useState } from 'react'
import data from '../data/photos.json'

const FALLBACK = data
const API = `${import.meta.env.BASE_URL}api/photos`

export function usePhotos() {
  const [state, setState] = useState({
    photos: FALLBACK.photos,
    categories: FALLBACK.categories,
    featuredCategories: Array.isArray(FALLBACK.featuredCategories) ? FALLBACK.featuredCategories : [],
    hero: Array.isArray(FALLBACK.hero) ? FALLBACK.hero : [],
    uploadMode: 'server',
    serverOk: false,
    checked: false,
  })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error(`api responded ${res.status}`)
      const json = await res.json()
      if (Array.isArray(json.photos)) {
        setState({
          photos: json.photos,
          categories: Array.isArray(json.categories) ? json.categories : FALLBACK.categories,
          featuredCategories: Array.isArray(json.featuredCategories) ? json.featuredCategories : [],
          hero: Array.isArray(json.hero) ? json.hero : [],
          uploadMode: json.uploadMode === 'blob' ? 'blob' : 'server',
          serverOk: true,
          checked: true,
        })
        return
      }
      throw new Error('malformed manifest')
    } catch {
      setState((s) => ({ ...s, serverOk: false, checked: true }))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    photos: state.photos,
    categories: state.categories,
    featuredCategories: state.featuredCategories,
    hero: state.hero,
    uploadMode: state.uploadMode,
    serverOk: state.serverOk,
    checked: state.checked,
    refresh,
  }
}
