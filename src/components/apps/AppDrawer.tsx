import { formatWhen } from '@/lib/format'
import type { LibraryApp } from '@/data/apps'
import { ScopeEditorSheet } from './ScopeTableEditor'

export { AppIcon, CategoryName } from './forms'

export function HistoryList({ app }: { app: LibraryApp }) {
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {app.history.map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-background bg-primary" />
          <p className="text-sm">{h.what}</p>
          <p className="text-xs text-muted-foreground">{h.who} · {formatWhen(h.at)}</p>
        </li>
      ))}
    </ol>
  )
}

/** Scope editing: the full-table editor. */
export const ScopeDrawer = ScopeEditorSheet
