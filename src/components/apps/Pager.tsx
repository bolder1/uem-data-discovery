// Previous / next paging for long lists (devices, users) — "26–50 of 412".
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size))
  const from = total ? (page - 1) * size + 1 : 0
  const to = Math.min(page * size, total)
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-2 text-sm text-muted-foreground">
      <span className="tabular-nums">{total ? `${from}–${to} of ${total}` : 'Nothing to show'}</span>
      <span className="flex">
        <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-4" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight className="size-4" /></Button>
      </span>
    </div>
  )
}
