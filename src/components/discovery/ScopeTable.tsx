import { Fragment, useState } from 'react'
import { ChevronRight, Globe, Lock } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { Scope } from '@/types'

export function ExposurePill({ public: isPublic }: { public: boolean }) {
  return isPublic ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Globe className="size-3" />
      Public
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <Lock className="size-3" />
      Private
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

export function ScopeTable({
  rows,
  noun,
  findingCount,
}: {
  rows: { scope: Scope; configName?: string }[]
  noun: string
  findingCount: (scopeId: string) => number
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{noun}</TableHead>
          <TableHead className="text-right">Objects</TableHead>
          <TableHead className="text-right">Sensitive</TableHead>
          <TableHead>Exposure</TableHead>
          <TableHead>Last Scan</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ scope, configName }) => {
          const expanded = open.has(scope.id)
          return (
            <Fragment key={scope.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => toggle(scope.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        expanded && 'rotate-90',
                      )}
                    />
                    <div className="leading-tight">
                      <p className="font-medium text-foreground">
                        {scope.name}
                      </p>
                      {configName && (
                        <p className="text-xs text-muted-foreground">
                          {configName}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {scope.objects}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-foreground">
                  {scope.sensitive}
                </TableCell>
                <TableCell>
                  <ExposurePill public={scope.publicAccess} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(scope.lastScan)}
                </TableCell>
                <TableCell />
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="bg-secondary/40">
                    <div className="grid grid-cols-2 gap-3 py-1 sm:grid-cols-3 lg:grid-cols-6">
                      <Stat label="Objects scanned" value={scope.objects} />
                      <Stat label="Sensitive objects" value={scope.sensitive} />
                      <Stat
                        label="Total findings"
                        value={findingCount(scope.id)}
                      />
                      <Stat
                        label="Data scanned"
                        value={formatBytes(scope.sizeBytes)}
                      />
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">
                          Exposure
                        </p>
                        <div className="mt-1">
                          <ExposurePill public={scope.publicAccess} />
                        </div>
                      </div>
                      <Stat
                        label="Last scan"
                        value={formatDateTime(scope.lastScan)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
