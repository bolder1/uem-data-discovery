import type { ConnectionStatus, Risk, ScanStatus } from '@/types'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return dateTimeFmt.format(new Date(iso))
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return dateFmt.format(new Date(iso))
}

export function formatDuration(sec?: number): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

type Meta = { label: string; dot: string; badge: string }

export const RISK_META: Record<Risk, Meta> = {
  low: {
    label: 'Low',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  high: {
    label: 'High',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  critical: {
    label: 'Critical',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
}

export const STATUS_META: Record<ConnectionStatus, Meta> = {
  connected: {
    label: 'Connected',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  error: {
    label: 'Error',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  'not-configured': {
    label: 'Not configured',
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  scanning: {
    label: 'Scanning',
    dot: 'bg-amber-500 animate-pulse',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

export const SCAN_STATUS_META: Record<ScanStatus, Meta> = {
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  running: {
    label: 'Running',
    dot: 'bg-amber-500 animate-pulse',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  queued: {
    label: 'Queued',
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}
