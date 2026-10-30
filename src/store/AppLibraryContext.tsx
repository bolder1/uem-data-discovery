import { createContext, useContext, useMemo, useState } from 'react'
import {
  initialApps,
  initialBuilds,
  initialCategories,
  byPriority,
  DEFAULT_PRIORITY,
  syncStats,
  type AppCategory,
  type InHouseBuild,
  type LibraryApp,
} from '@/data/apps'

function useAppLibraryState() {
  const [apps, setApps] = useState(initialApps)
  const [builds, setBuilds] = useState(initialBuilds)
  const [rawCategories, setCategoriesRaw] = useState(initialCategories)
  const categories = useMemo(() => [...rawCategories].sort(byPriority), [rawCategories])

  const today = () => new Date().toISOString().slice(0, 10)
  // Every write re-derives install stats from the scope and lands in History.
  const save = (a: LibraryApp, what: string): LibraryApp => ({
    ...a,
    stats: syncStats(a),
    history: [{ at: new Date().toISOString(), who: 'Abhijeet', what }, ...a.history],
  })

  return {
    apps,
    builds,
    categories,
    setBuilds,
    addApp: (a: LibraryApp) => setApps((list) => [a, ...list]),
    updateApp: (a: LibraryApp, what = 'Updated settings') => setApps((list) => list.map((x) => (x.id === a.id ? save(a, what) : x))),
    patchApps: (ids: Set<string>, p: Partial<LibraryApp>, what: string) =>
      setApps((list) => list.map((x) => (ids.has(x.id) ? save({ ...x, ...p }, what) : x))),
    deleteApps: (ids: Set<string>) => setApps((list) => list.filter((a) => !ids.has(a.id))),
    createCategory: (name: string) => {
      const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
      if (existing) return existing.id
      const id = `c-${Date.now()}`
      setCategoriesRaw((list) => [...list, { id, name, priority: DEFAULT_PRIORITY, createdAt: today() }])
      return id
    },
    addCategory: (c: Omit<AppCategory, 'id' | 'createdAt'>) => {
      const id = `c-${Date.now()}`
      setCategoriesRaw((list) => [...list, { ...c, id, createdAt: today() }])
      return id
    },
    updateCategory: (id: string, p: Partial<AppCategory>) => setCategoriesRaw((list) => list.map((c) => (c.id === id ? { ...c, ...p } : c))),
    /** Delete a category and move its apps to `moveTo` (or leave them uncategorized). */
    deleteCategory: (id: string, moveTo: string | null) => {
      setCategoriesRaw((list) => list.filter((c) => c.id !== id))
      // Self Service listings follow the move too.
      const swap = (ids: string[]) => [...new Set(ids.map((x) => (x === id ? moveTo : x)))].filter((x): x is string => !!x)
      setApps((list) => list.map((a) => ({
        ...a,
        categoryId: a.categoryId === id ? moveTo : a.categoryId,
        selfService: { ...a.selfService, displayIn: swap(a.selfService.displayIn), featureIn: swap(a.selfService.featureIn) },
      })))
    },
    addBuild: (b: InHouseBuild) => setBuilds((list) => [b, ...list]),
  }
}

type AppLibraryStore = ReturnType<typeof useAppLibraryState>
const Ctx = createContext<AppLibraryStore | null>(null)

// ponytail: in-memory only, resets on reload. Swap for API calls when the backend exists.
export function AppLibraryProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={useAppLibraryState()}>{children}</Ctx.Provider>
}

export function useAppLibrary() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppLibrary must be inside AppLibraryProvider')
  return v
}
