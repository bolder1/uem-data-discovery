// Prototype: which design to show while alternatives are being compared.
// Kept per browser so the choice follows you between pages. Remove once a design is picked.
import { useSyncExternalStore } from 'react'

export const headerDesigns = ['classic', 'classic-v2', 'revamped', 'revamped-v2'] as const
export type HeaderDesign = (typeof headerDesigns)[number]

const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

function useStored<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(subscribe, () => {
    try {
      const v = localStorage.getItem(key) as T | null
      return v && allowed.includes(v) ? v : fallback
    } catch {
      return fallback
    }
  })
  const set = (v: T) => {
    try { localStorage.setItem(key, v) } catch { /* private mode: the choice just won't stick */ }
    listeners.forEach((l) => l())
  }
  return [value, set]
}

/** Header design on the app page. Revamped is the default. */
export const useHeaderDesign = () => useStored<HeaderDesign>('dd-design-header-v2', headerDesigns, 'revamped')
