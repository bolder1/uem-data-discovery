import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  ShieldCheck,
  Eye,
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
import { ClassificationWizard } from '@/components/contentFiltering/ClassificationWizard'
import { formatDateTime } from '@/lib/format'
import type { DlpClassification } from '@/types'

function LabelPills({ ids }: { ids: string[] }) {
  const { labels } = useContentFiltering()
  if (ids.length === 0) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const l = labels.find((x) => x.id === id)
        if (!l) return null
        return (
          <Badge key={id} variant="secondary" className="font-medium">
            {l.name}
          </Badge>
        )
      })}
    </div>
  )
}

// The original list showed labels but gave no visibility into detection
// coverage — you couldn't tell if a classification actually did anything
// without opening it. This surfaces the rule count directly in the table.
function RulesSummary({ classification }: { classification: DlpClassification }) {
  const { ruleDictionary } = useContentFiltering()
  const names = [
    ...classification.ruleIds.map(
      (id) => ruleDictionary.find((r) => r.id === id)?.name ?? id,
    ),
    ...classification.customRules.map((r) => r.name),
  ]
  const count = names.length
  if (count === 0) {
    return <span className="text-sm text-muted-foreground">No rules yet</span>
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default text-sm font-medium tabular-nums text-foreground">
          {count} {count === 1 ? 'rule' : 'rules'}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{names.join(', ')}</TooltipContent>
    </Tooltip>
  )
}

export function ClassificationList() {
  const {
    customClassifications,
    defaultClassifications,
    deleteClassification,
    duplicateClassification,
  } = useContentFiltering()

  const [tab, setTab] = useState('custom')
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<DlpClassification | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<DlpClassification | null>(null)

  const q = query.trim().toLowerCase()
  const customRows = useMemo(
    () =>
      customClassifications.filter(
        (c) => !q || `${c.name} ${c.description}`.toLowerCase().includes(q),
      ),
    [customClassifications, q],
  )
  const defaultRows = useMemo(
    () =>
      defaultClassifications.filter(
        (c) => !q || `${c.name} ${c.description}`.toLowerCase().includes(q),
      ),
    [defaultClassifications, q],
  )

  const openCreate = () => {
    setEditing(undefined)
    setDrawerOpen(true)
  }
  const openEdit = (c: DlpClassification) => {
    setEditing(c)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Content Filtering', to: '/content-filtering/classification' },
          { label: 'Classification' },
        ]}
        title="Classification"
        description="Establish classifications to categorize sensitive data."
        actions={
          tab === 'custom' && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Classification
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="default">Default</TabsTrigger>
        </TabsList>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="h-9 pl-9"
          />
        </div>

        <TabsContent value="custom">
          {customRows.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title={q ? 'No classifications match this search' : 'No custom classifications yet'}
              description={
                q
                  ? 'Adjust your search to widen the results.'
                  : 'Create a classification to group labels and detection rules together.'
              }
              action={
                !q && (
                  <Button onClick={openCreate}>
                    <Plus className="size-4" />
                    Add Classification
                  </Button>
                )
              }
            />
          ) : (
            <Card className="p-0">
              <Table className="[&_td]:px-5 [&_td]:py-3.5 [&_th]:h-auto [&_th]:px-5 [&_th]:py-3">
                <TableHeader>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead>Rules</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRows.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-accent/40"
                      onClick={() => openEdit(c)}
                    >
                      <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {c.description}
                      </TableCell>
                      <TableCell>
                        <LabelPills ids={c.labelIds} />
                      </TableCell>
                      <TableCell>
                        <RulesSummary classification={c} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(c.updatedAt)}
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Actions for ${c.name}`}
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateClassification(c.id)}>
                              <Copy className="size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(e) => {
                                e.preventDefault()
                                setConfirmDelete(c)
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="default">
          {defaultRows.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No default classifications match this search"
              description="Adjust your search to widen the results."
            />
          ) : (
            <Card className="p-0">
              <Table className="[&_td]:px-5 [&_td]:py-3.5 [&_th]:h-auto [&_th]:px-5 [&_th]:py-3">
                <TableHeader>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead>Rules</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultRows.map((c) => (
                    <TableRow key={c.id} className="hover:bg-accent/40">
                      <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.description}
                      </TableCell>
                      <TableCell>
                        <LabelPills ids={c.labelIds} />
                      </TableCell>
                      <TableCell>
                        <RulesSummary classification={c} />
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Actions for ${c.name}`}
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Eye className="size-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateClassification(c.id)}>
                              <Copy className="size-4" />
                              Duplicate to custom
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {drawerOpen && (
        <ClassificationWizard
          open
          editClassification={editing}
          onOpenChange={setDrawerOpen}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this classification?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirmDelete?.name}” will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDelete) deleteClassification(confirmDelete.id)
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
