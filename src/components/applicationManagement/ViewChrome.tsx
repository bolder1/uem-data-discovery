import { Search, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { platformLabel } from './PlatformIcon'
import { ViewSwitcher } from './ViewSwitcher'
import type { AppMgmtViewProps } from './appMgmtView'

// Shared page chrome (title + Layout switcher, and the OS-tabs / search /
// upload toolbar) reused by the redesign experiences.
export function Header({
  view,
  onChangeView,
}: {
  view: AppMgmtViewProps['view']
  onChangeView: AppMgmtViewProps['onChangeView']
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Application Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload once, then deploy and govern apps across your enrolled devices.
        </p>
      </div>
      <ViewSwitcher view={view} onChange={onChangeView} />
    </div>
  )
}

export function Toolbar({
  os,
  onSwitchOs,
  query,
  onQueryChange,
  onUpload,
}: {
  os: AppMgmtViewProps['os']
  onSwitchOs: AppMgmtViewProps['onSwitchOs']
  query: string
  onQueryChange: (q: string) => void
  onUpload: () => void
}) {
  return (
    <>
      <div className="border-b border-border">
        <div className="flex gap-8">
          {(['windows', 'macos'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSwitchOs(p)}
              className={cn(
                '-mb-px border-b-2 px-1 pb-2.5 pt-1 text-sm font-semibold transition-colors',
                os === p
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {platformLabel(p)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by app name or publisher"
            className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
        >
          <Upload className="size-4" />
          Upload {platformLabel(os)} App
        </button>
      </div>
    </>
  )
}
