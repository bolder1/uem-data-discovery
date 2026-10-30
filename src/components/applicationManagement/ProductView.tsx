import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Search,
  MoreVertical,
  Info,
  ShieldCheck,
  Trash2,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AppWindow,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatBytes, formatDate } from '@/lib/format'
import { platformLabel } from './PlatformIcon'
import { AppIcon } from './AppIcon'
import { ViewSwitcher } from './ViewSwitcher'
import { PoliciesCell } from './PoliciesCell'
import { GroupAddedCell } from './GroupAddedCell'
import type { AppMgmtViewProps } from './appMgmtView'

const PAGE_SIZE = 5

// A skin that mirrors the live product (MUI-based): underline blue tabs, a
// light-header table with the name as a blue link, a Bulk Action menu, an
// icon-left search, solid-blue actions and reference-style pagination.
export function ProductView(props: AppMgmtViewProps) {
  const {
    view,
    onChangeView,
    os,
    onSwitchOs,
    query,
    onQueryChange,
    rows,
    recentId,
    appPolicies,
    selected,
    onToggleRow,
    onToggleAll,
    allVisibleSelected,
    someVisibleSelected,
    selectedIds,
    onUpload,
    onOpenDetails,
    onOpenUpdate,
    onAssign,
    onRequestDelete,
  } = props

  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [os, query])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [rows, current],
  )

  const applyBulk = (fn: () => void) => {
    if (selected.size === 0) return
    fn()
  }

  return (
    <div data-skin="product" className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900">
            Application Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and deploy your organization&rsquo;s Windows and macOS applications
          </p>
        </div>
        <ViewSwitcher view={view} onChange={onChangeView} />
      </div>

      {/* underline tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <TabButton active={os === 'windows'} onClick={() => onSwitchOs('windows')}>
            Windows
          </TabButton>
          <TabButton active={os === 'macos'} onClick={() => onSwitchOs('macos')}>
            macOS
          </TabButton>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by app name or publisher"
            className="h-11 w-full rounded-[6px] border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20"
          />
        </div>
        <button
          type="button"
          onClick={onUpload}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-[4px] bg-[#1a56db] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1e40af]"
        >
          <Upload className="size-4" />
          Upload {platformLabel(os)} App
        </button>
      </div>

      {/* bulk action */}
      <BulkActionMenu
        count={selected.size}
        onDelete={() => applyBulk(() => onRequestDelete({ kind: 'bulk', ids: selectedIds }))}
      />

      {/* table */}
      <div className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={
                      allVisibleSelected
                        ? true
                        : someVisibleSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={onToggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Application</th>
                <th className="px-4 py-3 font-semibold">Version</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Group added</th>
                <th className="px-4 py-3 font-semibold">Uploaded on</th>
                <th className="px-4 py-3 font-semibold">Policies</th>
                <th className="w-[85px] px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <AppWindow className="size-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {query.trim()
                          ? 'No applications match this search'
                          : `No ${platformLabel(os)} applications yet`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {query.trim()
                          ? 'Adjust your search to widen the results.'
                          : `Upload a ${platformLabel(os)} package to deploy it across your devices.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((app) => {
                  const head = app.versions[0]
                  const isSel = selected.has(app.id)
                  return (
                    <tr
                      key={app.id}
                      onClick={() => onOpenDetails(app.id)}
                      className={cn(
                        'cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50',
                        isSel && 'bg-blue-50/50',
                        app.id === recentId && 'bg-blue-50',
                      )}
                    >
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={() => onToggleRow(app.id)}
                          aria-label={`Select ${app.name}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <AppIcon app={app} size="sm" showPlatformBadge />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1a56db] hover:underline">
                              {app.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {app.publisher}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-600">
                        {head?.version ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-600">
                        {head ? formatBytes(head.sizeBytes) : '—'}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        <GroupAddedCell
                          count={head?.publishedGroups ?? 0}
                          appId={app.id}
                          product
                        />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {head ? formatDate(head.uploadedAt) : '—'}
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <PoliciesCell
                          app={app}
                          appPolicies={appPolicies}
                          onAssign={() => onAssign(app)}
                          product
                        />
                      </td>
                      <td
                        className="px-4 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Actions for ${app.name}`}
                              className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpenDetails(app.id)}>
                              <Info className="size-4" />
                              Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenUpdate(app)}>
                              <Upload className="size-4" />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAssign(app)}>
                              <ShieldCheck className="size-4" />
                              Assign policies
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(e) => {
                                e.preventDefault()
                                onRequestDelete({ kind: 'app', app })
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* pagination */}
      {rows.length > 0 && (
        <Pagination
          page={current}
          pageCount={pageCount}
          onPage={setPage}
          total={rows.length}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition-colors',
        active
          ? 'border-[#1a56db] text-[#1a56db]'
          : 'border-transparent text-slate-500 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  )
}

function BulkActionMenu({
  count,
  onDelete,
}: {
  count: number
  onDelete: () => void
}) {
  const disabled = count === 0
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-[6px] border px-4 text-sm font-medium transition-colors',
            disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
          )}
        >
          Bulk Action{count > 0 ? ` (${count})` : ''}
          <ChevronDown className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete selected
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Page tokens: first, last, current±1, with ellipses — matches the product pager.
function pageTokens(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7)
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  const tokens: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  if (start > 2) tokens.push('gap')
  for (let i = start; i <= end; i++) tokens.push(i)
  if (end < pageCount - 1) tokens.push('gap')
  tokens.push(pageCount)
  return tokens
}

function Pagination({
  page,
  pageCount,
  onPage,
  total,
}: {
  page: number
  pageCount: number
  onPage: (p: number) => void
  total: number
}) {
  const tokens = pageTokens(page, pageCount)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <PagerButton
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </PagerButton>
        {tokens.map((t, i) =>
          t === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <PagerButton
              key={t}
              onClick={() => onPage(t)}
              active={t === page}
            >
              {t}
            </PagerButton>
          ),
        )}
        <PagerButton
          onClick={() => onPage(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </PagerButton>
      </div>
      <span className="text-sm text-slate-500">Total apps: {total}</span>
    </div>
  )
}

function PagerButton({
  children,
  onClick,
  active,
  disabled,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[4px] text-sm font-medium transition-colors',
        active
          ? 'bg-slate-800 text-white'
          : 'text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  )
}
