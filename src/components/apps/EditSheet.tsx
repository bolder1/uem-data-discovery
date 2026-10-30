// Read-only section cards for an app, and the side panel each card's Edit opens.
// Pages show facts; editing only ever happens in the panel.
import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { plistProblem, type LibraryApp } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'
import { ScopeEditorSheet } from './ScopeTableEditor'
import {
  AttributesForm,
  ConfigForm,
  DomainsForm,
  GeneralForm,
  LicenseBanner,
  SelfServiceForm,
  keepInlineEscape,
  useConfirmClose,
} from './forms'

export type EditKey = 'general' | 'scope' | 'selfService' | 'config' | 'attributes' | 'domains' | 'more'

const titles: Record<EditKey, string> = {
  general: 'General',
  scope: 'Scope',
  selfService: 'Self Service',
  config: 'App configuration',
  attributes: 'Attributes',
  domains: 'Associated domains',
  more: 'Attributes & domains',
}

export function EditSheet(props: { app: LibraryApp; step: EditKey; onClose: () => void }) {
  // Scope has its own full-table editor.
  return props.step === 'scope' ? <ScopeEditorSheet app={props.app} onClose={props.onClose} /> : <EditPanel {...props} />
}

function EditPanel({ app, step, onClose }: { app: LibraryApp; step: EditKey; onClose: () => void }) {
  const { categories, createCategory, updateApp } = useAppLibrary()
  const [draft, setDraft] = useState(app)
  const set = (p: Partial<LibraryApp>) => setDraft((d) => ({ ...d, ...p }))
  const { requestClose, dialog } = useConfirmClose(JSON.stringify(draft) !== JSON.stringify(app), onClose)
  const title = titles[step]
  const problem = !draft.name.trim() ? 'Entry name is required.' : step === 'config' ? plistProblem(draft.config?.plist ?? '') : null
  return (
    <Sheet open onOpenChange={(o) => !o && requestClose()}>
      <SheetContent side="right" onEscapeKeyDown={keepInlineEscape}
        className={cn('flex w-full flex-col gap-0 p-0', step === 'selfService' ? 'sm:max-w-2xl' : 'sm:max-w-xl')}>
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription>{app.name}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {step === 'general' && (
            <>
              <LicenseBanner app={draft} />
              <GeneralForm draft={draft} set={set} categories={categories} onCreateCategory={createCategory} />
            </>
          )}
          {step === 'selfService' && <SelfServiceForm draft={draft} set={set} categories={categories} />}
          {step === 'config' && <ConfigForm draft={draft} set={set} />}
          {step === 'attributes' && <AttributesForm draft={draft} set={set} />}
          {step === 'domains' && <DomainsForm draft={draft} set={set} />}
          {step === 'more' && (
            <>
              <section className="space-y-2"><h3 className="font-medium">Attributes</h3><AttributesForm draft={draft} set={set} /></section>
              <section className="space-y-2"><h3 className="font-medium">Associated domains</h3><DomainsForm draft={draft} set={set} /></section>
            </>
          )}
        </div>
        <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-3">
          {problem && <span className="mr-auto text-sm text-destructive">{problem}</span>}
          <Button variant="outline" onClick={requestClose}><X className="size-4" />Cancel</Button>
          <Button disabled={!!problem} onClick={() => { updateApp(draft, `${title} updated`); onClose() }}>
            <Check className="size-4" />Save
          </Button>
        </SheetFooter>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}

/** A read-only section with its own Edit. */
export function DetailCard({ title, onEdit, children, className }: { title: string; onEdit?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('gap-0 p-0', className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-5 py-2">
        <h2 className="font-semibold">{title}</h2>
        {onEdit && (
          <Button variant="ghost" size="sm" aria-label={`Edit ${title}`} onClick={onEdit}><Pencil className="size-4" />Edit</Button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}

/** Label-over-value pairs, for scanning. */
export function Facts({ items, cols = 2 }: { items: [string, React.ReactNode][]; cols?: 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-4 text-sm', cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 break-words font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
