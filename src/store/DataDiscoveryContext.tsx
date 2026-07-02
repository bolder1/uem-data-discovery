import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Configuration,
  ConnectionStatus,
  Finding,
  FindingStatus,
  Policy,
  ScanJob,
} from '@/types'
import {
  seedConfigurations,
  seedFindings,
  seedPolicies,
  seedScans,
} from '@/data'
import { synthesizeFindings } from '@/lib/synthesize'

const CURRENT_USER = 'gautam'

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`

const nowIso = () => new Date().toISOString()

type NewConfiguration = Omit<
  Configuration,
  'id' | 'createdAt' | 'createdBy' | 'status' | 'lastRotated'
> & { status?: ConnectionStatus }

type NewPolicy = Omit<Policy, 'id' | 'createdAt' | 'createdBy'>

interface ContextValue {
  currentUser: string
  configurations: Configuration[]
  policies: Policy[]
  scans: ScanJob[]
  findings: Finding[]
  addConfiguration: (input: NewConfiguration) => Configuration
  updateConfiguration: (id: string, patch: Partial<Configuration>) => void
  deleteConfiguration: (id: string) => void
  addPolicy: (input: NewPolicy) => Policy
  updatePolicy: (id: string, patch: Partial<NewPolicy>) => void
  togglePolicy: (id: string) => void
  deletePolicy: (id: string) => void
  runScan: (policyId: string) => ScanJob | undefined
  updateFindingStatus: (id: string, status: FindingStatus) => void
}

const DataDiscoveryContext = createContext<ContextValue | null>(null)

export function DataDiscoveryProvider({ children }: { children: ReactNode }) {
  const [configurations, setConfigurations] =
    useState<Configuration[]>(seedConfigurations)
  const [policies, setPolicies] = useState<Policy[]>(seedPolicies)
  const [scans, setScans] = useState<ScanJob[]>(seedScans)
  const [findings, setFindings] = useState<Finding[]>(seedFindings)

  const addConfiguration = useCallback((input: NewConfiguration) => {
    const cfg: Configuration = {
      ...input,
      id: uid('cfg'),
      status: input.status ?? 'connected',
      createdAt: nowIso(),
      createdBy: CURRENT_USER,
      lastRotated: nowIso(),
    }
    setConfigurations((prev) => [...prev, cfg])
    return cfg
  }, [])

  const updateConfiguration = useCallback(
    (id: string, patch: Partial<Configuration>) => {
      setConfigurations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      )
    },
    [],
  )

  const deleteConfiguration = useCallback((id: string) => {
    setConfigurations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const addPolicy = useCallback((input: NewPolicy) => {
    const policy: Policy = {
      ...input,
      id: uid('pol'),
      createdAt: nowIso(),
      createdBy: CURRENT_USER,
    }
    setPolicies((prev) => [policy, ...prev])
    return policy
  }, [])

  const updatePolicy = useCallback((id: string, patch: Partial<NewPolicy>) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }, [])

  const togglePolicy = useCallback((id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: !p.status } : p)),
    )
  }, [])

  const deletePolicy = useCallback((id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const runScan = useCallback(
    (policyId: string) => {
      const policy = policies.find((p) => p.id === policyId)
      // Don't run disabled policies, missing ones, or ones with empty scope.
      if (!policy || !policy.status) return undefined
      const cfg = configurations.find((c) => c.id === policy.configurationId)
      const selected =
        cfg?.scopes.filter((s) => policy.scopeIds.includes(s.id)) ?? []
      if (!cfg || selected.length === 0) return undefined

      const scanId = uid('scan')
      const startedAt = nowIso()
      const scan: ScanJob = {
        id: scanId,
        policyId,
        configurationId: policy.configurationId,
        status: 'running',
        startedAt,
        objectsScanned: selected.reduce((n, s) => n + s.objects, 0),
        sensitiveFound: selected.reduce((n, s) => n + s.sensitive, 0),
        dataScannedBytes: selected.reduce((n, s) => n + s.sizeBytes, 0),
        scopeIds: policy.scopeIds,
      }
      // Connect scan -> results: the run produces actual findings.
      const produced = synthesizeFindings(policy, cfg, selected, scanId, startedAt)

      setScans((prev) => [scan, ...prev])
      setFindings((prev) => [...produced, ...prev])
      setPolicies((prev) =>
        prev.map((p) => (p.id === policyId ? { ...p, lastRun: startedAt } : p)),
      )

      // Finish shortly after, so the running -> completed state is real.
      setTimeout(() => {
        setScans((prev) =>
          prev.map((s) =>
            s.id === scanId
              ? { ...s, status: 'completed', durationSec: 60 + selected.length * 47 }
              : s,
          ),
        )
      }, 1500)

      return scan
    },
    [policies, configurations],
  )

  const updateFindingStatus = useCallback(
    (id: string, status: FindingStatus) => {
      setFindings((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f)),
      )
    },
    [],
  )

  const value = useMemo<ContextValue>(
    () => ({
      currentUser: CURRENT_USER,
      configurations,
      policies,
      scans,
      findings,
      addConfiguration,
      updateConfiguration,
      deleteConfiguration,
      addPolicy,
      updatePolicy,
      togglePolicy,
      deletePolicy,
      runScan,
      updateFindingStatus,
    }),
    [
      configurations,
      policies,
      scans,
      findings,
      addConfiguration,
      updateConfiguration,
      deleteConfiguration,
      addPolicy,
      updatePolicy,
      togglePolicy,
      deletePolicy,
      runScan,
      updateFindingStatus,
    ],
  )

  return (
    <DataDiscoveryContext.Provider value={value}>
      {children}
    </DataDiscoveryContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataDiscovery() {
  const ctx = useContext(DataDiscoveryContext)
  if (!ctx)
    throw new Error('useDataDiscovery must be used within DataDiscoveryProvider')
  return ctx
}
