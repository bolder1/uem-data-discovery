// Small pieces shared by the device page's tabs.
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/data/deviceDetail'

export const toneClass: Record<Tone, string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  off: 'border-slate-200 bg-slate-50 text-slate-600',
  warn: 'border-amber-200 bg-amber-50 text-amber-700',
}

export function TonePill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex rounded border px-1.5 py-0.5 text-xs font-medium', toneClass[tone])}>{children}</span>
}

export const NeedsPill = ({ n }: { n: number }) => <TonePill tone="warn">{n} to fix</TonePill>

export function Meter({ pct, warn, className }: { pct: number; warn?: boolean; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-secondary', className)} role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', warn ? 'bg-amber-500' : 'bg-brand')} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export function SectionCard({ title, description, aside, children, className }: { title: string; description?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-3.5">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  )
}

/** One toast at a time, bottom-center, gone after a few seconds. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3200)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg && (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">{msg}</div>
  )
  return { toast: setMsg, node }
}
