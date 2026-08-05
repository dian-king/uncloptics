import { useCallback, useEffect, useState } from 'react'
import data from '../data/photos.json'

const FALLBACK = data
const API = `${import.meta.env.BASE_URL}api/photos`

export function usePhotos() {
  const [state, setState] = useState({
    photos: FALLBACK.photos,
    categories: FALLBACK.categories,
    featuredCategories: Array.isArray(FALLBACK.featuredCategories) ? FALLBACK.featuredCategories : [],
    serverOk: false,
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
          serverOk: true,
        })
        return
      }
      throw new Error('malformed manifest')
    } catch {
      setState((s) => ({ ...s, serverOk: false }))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { photos: state.photos, categories: state.categories, featuredCategories: state.featuredCategories, serverOk: state.serverOk, refresh }
}
