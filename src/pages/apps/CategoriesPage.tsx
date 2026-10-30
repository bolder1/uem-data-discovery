// Categories — one global list, as in Jamf: a name and a priority (1 shows first).
// Used by every app library, Self Service and anything else that groups items.
import { useMemo, useState } from 'react'
import { Check, MoreVertical, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { EmptyState, PageHeader } from '@/components/common'
import { useConfirmClose } from '@/components/apps/forms'
import { DEFAULT_PRIORITY, categoryPriorities, type AppCategory } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'

function CategorySheet({ category, onClose }: { category: AppCategory | null; onClose: () => void }) {
  const { categories, addCategory, updateCategory } = useAppLibrary()
  const [initial] = useState(() => ({ name: category?.name ?? '', priority: category?.priority ?? DEFAULT_PRIORITY }))
  const [d, setD] = useState(initial)
  const { requestClose, dialog } = useConfirmClose(d.name !== initial.name || d.priority !== initial.priority, onClose)
  const name = d.name.trim()
  const taken = categories.some((c) => c.id !== category?.id && c.name.toLowerCase() === name.toLowerCase())

  const save = () => {
    const value = { name, priority: d.priority }
    if (category) updateCategory(category.id, value)
    else addCategory(value)
    onClose()
  }

  return (
    <Sheet open onOpenChange={(o) => !o && requestClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">{category ? 'Edit category' : 'New category'}</SheetTitle>
          <SheetDescription className="sr-only">Name and priority</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name<span className="text-destructive">*</span></Label>
            <Input id="cat-name" autoFocus value={d.name} aria-invalid={taken} onChange={(e) => setD({ ...d, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && name && !taken && save()} placeholder="e.g. Finance" />
            {taken && <p className="text-xs text-destructive">A category with this name already exists.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-priority">Priority</Label>
            <Select value={String(d.priority)} onValueChange={(v) => setD({ ...d, priority: Number(v) })}>
              <SelectTrigger id="cat-priority" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryPriorities.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">1 is listed first. Categories with the same priority are listed A–Z.</p>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={requestClose}><X className="size-4" />Cancel</Button>
          <Button disabled={!name || taken} onClick={save}><Check className="size-4" />{category ? 'Save' : 'Create'}</Button>
        </SheetFooter>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}

function DeleteCategory({ category, onClose }: { category: AppCategory; onClose: () => void }) {
  const { categories, apps, deleteCategory } = useAppLibrary()
  const count = apps.filter((a) => a.categoryId === category.id).length
  const [moveTo, setMoveTo] = useState('none')
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{category.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {count ? `${count} ${count === 1 ? 'app uses' : 'apps use'} this category. Choose where to move ${count === 1 ? 'it' : 'them'}.` : 'Nothing uses this category.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {count > 0 && (
          <Select value={moveTo} onValueChange={setMoveTo}>
            <SelectTrigger className="w-full" aria-label="Move apps to"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.filter((c) => c.id !== category.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive"
            onClick={() => { deleteCategory(category.id, moveTo === 'none' ? null : moveTo); onClose() }}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CategoriesPage() {
  const { categories } = useAppLibrary()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AppCategory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<AppCategory | null>(null)

  const q = query.trim().toLowerCase()
  // Already in priority order from the store.
  const rows = useMemo(() => categories.filter((c) => !q || c.name.toLowerCase().includes(q)), [categories, q])

  const newButton = <Button onClick={() => setEditing('new')}><Plus className="size-4" />New category</Button>

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Mobile Device Management' }, { label: 'Categories' }]}
        title="Categories"
        description="One list, used everywhere items are grouped"
        actions={newButton}
      />

      {categories.length === 0 ? (
        <EmptyState icon={Tag} title="No categories yet" description="Group apps so users can find them in Self Service." action={newButton} />
      ) : (
        <>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories" aria-label="Search categories" className="h-9 pl-9" />
          </div>

          <Card className="gap-0 overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-24">Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-16 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setEditing(c)}>
                      <TableCell className="tabular-nums">{c.priority}</TableCell>
                      <TableCell>
                        {/* The name is the keyboard target; the row click is a mouse shortcut. */}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(c) }}
                          className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}><MoreVertical className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(c)}><Pencil className="size-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}><Trash2 className="size-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!rows.length && (
                  <TableRow><TableCell colSpan={3} className="py-8 text-muted-foreground">No categories match “{query}”.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {editing && <CategorySheet key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteCategory category={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
