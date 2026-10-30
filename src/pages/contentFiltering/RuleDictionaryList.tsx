import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  BookMarked,
} from 'lucide-react'
import { useContentFiltering } from '@/store/ContentFilteringContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PageHeader, EmptyState } from '@/components/common'
import { RuleDrawer } from '@/components/contentFiltering/RuleDrawer'
import type { Rule } from '@/types'

// A rule's criteria are the substance of it — a reader wants to know *what*
// it matches without opening an editor. The list surfaces the count with the
// full breakdown on hover, matching how Classification shows its rule count.
function CriteriaSummary({ rule }: { rule: Rule }) {
  const count = rule.criteria.length
  if (count === 0)
    return <span className="text-sm text-muted-foreground">No criteria</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default text-sm font-medium tabular-nums text-foreground">
          {count} {count === 1 ? 'criterion' : 'criteria'}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <ul className="space-y-0.5">
          {rule.criteria.map((c, i) => (
            <li key={i}>
              <span className="font-medium">{c.type}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-mono">{c.value}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

function CategoryCell({ category }: { category?: string }) {
  if (!category) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <Badge variant="secondary" className="font-medium">
      {category}
    </Badge>
  )
}

export function RuleDictionaryList() {
  const { ruleDictionary, deleteRule, duplicateRule } = useContentFiltering()

  const [tab, setTab] = useState('custom')
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<Rule | null>(null)

  const q = query.trim().toLowerCase()
  const matches = (r: Rule) =>
    !q || `${r.name} ${r.category ?? ''}`.toLowerCase().includes(q)

  const customRows = useMemo(
    () => ruleDictionary.filter((r) => !r.isDefault && matches(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruleDictionary, q],
  )
  const defaultRows = useMemo(
    () => ruleDictionary.filter((r) => r.isDefault && matches(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruleDictionary, q],
  )
  const customCount = ruleDictionary.filter((r) => !r.isDefault).length

  const openCreate = () => {
    setEditing(undefined)
    setDrawerOpen(true)
  }
  const openEdit = (r: Rule) => {
    setEditing(r)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Content Filtering', to: '/content-filtering/classification' },
          { label: 'Rule Dictionary' },
        ]}
        title="Rule Dictionary"
        description="Reusable detection rules that classifications share to identify sensitive data."
        actions={
          tab === 'custom' && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Rule
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="custom">
            Custom
            {customCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {customCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="default">Default</TabsTrigger>
        </TabsList>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or category…"
            className="h-9 pl-9"
          />
        </div>

        <TabsContent value="custom">
          {customRows.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title={q ? 'No rules match this search' : 'No custom rules yet'}
              description={
                q
                  ? 'Adjust your search to widen the results.'
                  : 'Write a reusable detection rule that any classification can pick up.'
              }
              action={
                !q && (
                  <Button onClick={openCreate}>
                    <Plus className="size-4" />
                    Add Rule
                  </Button>
                )
              }
            />
          ) : (
            <RuleTable
              rows={customRows}
              onEdit={openEdit}
              onDuplicate={(r) => duplicateRule(r.id)}
              onDelete={(r) => setConfirmDelete(r)}
            />
          )}
        </TabsContent>

        <TabsContent value="default">
          {defaultRows.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="No default rules match this search"
              description="Adjust your search to widen the results."
            />
          ) : (
            <RuleTable
              rows={defaultRows}
              isDefault
              onDuplicate={(r) => duplicateRule(r.id)}
            />
          )}
        </TabsContent>
      </Tabs>

      {drawerOpen && (
        <RuleDrawer open editRule={editing} onOpenChange={setDrawerOpen} />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirmDelete?.name}” will be permanently removed. Classifications
              using it will stop matching on this rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDelete) deleteRule(confirmDelete.id)
                setConfirmDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RuleTable({
  rows,
  isDefault,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  rows: Rule[]
  isDefault?: boolean
  onEdit?: (r: Rule) => void
  onDuplicate: (r: Rule) => void
  onDelete?: (r: Rule) => void
}) {
  return (
    <Card className="p-0">
      <Table className="[&_td]:px-5 [&_td]:py-3.5 [&_th]:h-auto [&_th]:px-5 [&_th]:py-3">
        <TableHeader>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Criteria</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              className={isDefault ? 'hover:bg-accent/40' : 'cursor-pointer hover:bg-accent/40'}
              onClick={isDefault ? undefined : () => onEdit?.(r)}
            >
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              <TableCell>
                <CategoryCell category={r.category} />
              </TableCell>
              <TableCell>
                <CriteriaSummary rule={r} />
              </TableCell>
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Actions for ${r.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isDefault ? (
                      <DropdownMenuItem onClick={() => onDuplicate(r)}>
                        <Copy className="size-4" />
                        Duplicate to custom
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => onEdit?.(r)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate(r)}>
                          <Copy className="size-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(e) => {
                            e.preventDefault()
                            onDelete?.(r)
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
