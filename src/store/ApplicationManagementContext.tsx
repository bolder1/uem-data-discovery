import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppPlatform, AppPolicy, AppStatus, ManagedApp } from '@/types'
import { seedApplications, seedAppPolicies } from '@/data'

const CURRENT_USER = 'gautam'

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`

const nowIso = () => new Date().toISOString()

/** The fields the Upload wizard collects to create a new application. */
export interface NewApp {
  platform: AppPlatform
  name: string
  publisher: string
  iconUrl?: string
  packageType: string
  bundleId?: string
  commandLine?: string
  policyIds: string[]
  version: string
  sizeBytes: number
  architectures: string[]
}

/** The subset the Upload drawer collects when adding a new build to an app. */
export interface NewVersion {
  version: string
  sizeBytes: number
  architectures: string[]
}

interface ContextValue {
  currentUser: string
  apps: ManagedApp[]
  appPolicies: AppPolicy[]
  addApp: (input: NewApp) => ManagedApp
  addVersion: (appId: string, input: NewVersion) => void
  deleteApp: (id: string) => void
  deleteVersion: (appId: string, versionId: string) => void
  uninstallVersion: (appId: string, versionId: string) => void
  assignPolicies: (appId: string, policyIds: string[]) => void
  movePolicy: (id: string, dir: -1 | 1) => void
  setAppStatus: (id: string, status: AppStatus) => void
  publishApps: (ids: string[]) => void
  unpublishApps: (ids: string[]) => void
  deleteApps: (ids: string[]) => void
  setReleaseNotes: (appId: string, versionId: string, notes: string) => void
}

const ApplicationManagementContext = createContext<ContextValue | null>(null)

export function ApplicationManagementProvider({
  children,
}: {
  children: ReactNode
}) {
  const [apps, setApps] = useState<ManagedApp[]>(seedApplications)
  // The policy hierarchy is ordered; index 0 is the active (top-priority) policy.
  const [appPolicies, setAppPolicies] = useState<AppPolicy[]>(seedAppPolicies)

  const addApp = useCallback((input: NewApp) => {
    const app: ManagedApp = {
      id: uid('app'),
      platform: input.platform,
      name: input.name.trim(),
      publisher: input.publisher.trim() || 'Unknown publisher',
      iconUrl: input.iconUrl,
      status: 'draft',
      packageType: input.packageType,
      bundleId: input.bundleId?.trim() || undefined,
      commandLine: input.commandLine?.trim() || undefined,
      policyIds: input.policyIds,
      createdAt: nowIso(),
      createdBy: CURRENT_USER,
      versions: [
        {
          id: uid('v'),
          version: input.version.trim() || '1.0.0',
          sizeBytes: input.sizeBytes,
          uploadedAt: nowIso(),
          uploadedBy: CURRENT_USER,
          installedDevices: 0,
          publishedGroups: 0,
          architectures: input.architectures,
        },
      ],
    }
    setApps((prev) => [app, ...prev])
    return app
  }, [])

  const addVersion = useCallback((appId: string, input: NewVersion) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              versions: [
                {
                  id: uid('v'),
                  version: input.version.trim() || '1.0.0',
                  sizeBytes: input.sizeBytes,
                  uploadedAt: nowIso(),
                  uploadedBy: CURRENT_USER,
                  installedDevices: 0,
                  publishedGroups: 0,
                  architectures: input.architectures,
                },
                ...a.versions,
              ],
            }
          : a,
      ),
    )
  }, [])

  const deleteApp = useCallback((id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const deleteVersion = useCallback((appId: string, versionId: string) => {
    setApps((prev) =>
      prev.flatMap((a) => {
        if (a.id !== appId) return [a]
        const versions = a.versions.filter((v) => v.id !== versionId)
        // Removing the only version removes the application entirely.
        if (versions.length === 0) return []
        return [{ ...a, versions }]
      }),
    )
  }, [])

  // Uninstalling a build pulls it off every device it's currently on.
  const uninstallVersion = useCallback((appId: string, versionId: string) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              versions: a.versions.map((v) =>
                v.id === versionId
                  ? { ...v, installedDevices: 0, publishedGroups: 0 }
                  : v,
              ),
            }
          : a,
      ),
    )
  }, [])

  const assignPolicies = useCallback((appId: string, policyIds: string[]) => {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, policyIds } : a)))
  }, [])

  // Reorder the policy hierarchy — the topmost policy is the active one.
  const movePolicy = useCallback((id: string, dir: -1 | 1) => {
    setAppPolicies((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  const setAppStatus = useCallback((id: string, status: AppStatus) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }, [])

  const publishApps = useCallback((ids: string[]) => {
    const set = new Set(ids)
    setApps((prev) =>
      prev.map((a) => (set.has(a.id) ? { ...a, status: 'published' } : a)),
    )
  }, [])

  const unpublishApps = useCallback((ids: string[]) => {
    const set = new Set(ids)
    setApps((prev) =>
      prev.map((a) => (set.has(a.id) ? { ...a, status: 'draft' } : a)),
    )
  }, [])

  const deleteApps = useCallback((ids: string[]) => {
    const set = new Set(ids)
    setApps((prev) => prev.filter((a) => !set.has(a.id)))
  }, [])

  const setReleaseNotes = useCallback(
    (appId: string, versionId: string, notes: string) => {
      setApps((prev) =>
        prev.map((a) =>
          a.id === appId
            ? {
                ...a,
                versions: a.versions.map((v) =>
                  v.id === versionId ? { ...v, releaseNotes: notes } : v,
                ),
              }
            : a,
        ),
      )
    },
    [],
  )

  const value = useMemo<ContextValue>(
    () => ({
      currentUser: CURRENT_USER,
      apps,
      appPolicies,
      addApp,
      addVersion,
      deleteApp,
      deleteVersion,
      uninstallVersion,
      assignPolicies,
      movePolicy,
      setAppStatus,
      publishApps,
      unpublishApps,
      deleteApps,
      setReleaseNotes,
    }),
    [
      apps,
      appPolicies,
      addApp,
      addVersion,
      deleteApp,
      deleteVersion,
      uninstallVersion,
      assignPolicies,
      movePolicy,
      setAppStatus,
      publishApps,
      unpublishApps,
      deleteApps,
      setReleaseNotes,
    ],
  )

  return (
    <ApplicationManagementContext.Provider value={value}>
      {children}
    </ApplicationManagementContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApplicationManagement() {
  const ctx = useContext(ApplicationManagementContext)
  if (!ctx)
    throw new Error(
      'useApplicationManagement must be used within ApplicationManagementProvider',
    )
  return ctx
}
