import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  seedConfigProfiles,
  seedOnboardingProfiles,
  type ConfigProfile,
  type OnboardingProfile,
} from '@/data/profiles'

interface ProfilesStore {
  configProfiles: ConfigProfile[]
  onboardingProfiles: OnboardingProfile[]
  saveConfig: (p: ConfigProfile) => ConfigProfile
  saveOnboarding: (p: OnboardingProfile) => void
  removeConfig: (id: string) => void
  removeOnboarding: (id: string) => void
}

const Ctx = createContext<ProfilesStore | null>(null)
let seq = 0
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`

/** Upsert by id; an empty id means "create". */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [configProfiles, setConfig] = useState(seedConfigProfiles)
  const [onboardingProfiles, setOnboarding] = useState(seedOnboardingProfiles)

  const store: ProfilesStore = {
    configProfiles,
    onboardingProfiles,
    saveConfig: (p) => {
      const saved = { ...p, id: p.id || newId('cp'), updatedAt: new Date().toISOString() }
      setConfig((l) => upsert(l, saved))
      return saved
    },
    saveOnboarding: (p) => setOnboarding((l) => upsert(l, { ...p, id: p.id || newId('ob') })),
    removeConfig: (id) => setConfig((l) => l.filter((x) => x.id !== id)),
    removeOnboarding: (id) => setOnboarding((l) => l.filter((x) => x.id !== id)),
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useProfiles() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProfiles must be used inside ProfilesProvider')
  return v
}
