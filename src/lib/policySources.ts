import { providerById } from '@/data'
import type { Configuration, Policy } from '@/types'

// A policy can target sources across data types; older policies only carry
// the single configurationId.

/** Ids of every connection a policy targets. */
export function policySourceIds(p: Policy): string[] {
  return p.configurationIds?.length ? p.configurationIds : [p.configurationId]
}

/** The configurations a policy targets, in configuration-list order. */
export function policySources(
  p: Policy,
  configurations: Configuration[],
): Configuration[] {
  const ids = new Set(policySourceIds(p))
  return configurations.filter((c) => ids.has(c.id))
}

/** Buckets / Containers / Schemas… when all sources share a provider, else Targets. */
export function policyScopeNoun(sources: Configuration[]): string {
  const pids = [...new Set(sources.map((c) => c.providerId))]
  const p = pids.length === 1 ? providerById(pids[0]) : undefined
  return p?.scopeNounPlural ?? 'Targets'
}
