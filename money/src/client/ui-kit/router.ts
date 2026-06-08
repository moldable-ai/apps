import { useEffect, useState } from 'react'

/** Navigate within the SPA and notify listeners (history pushState + popstate). */
export function navigate(path: string) {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** Current pathname, reactive to back/forward and `navigate`. */
export function useRoute(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return path
}
