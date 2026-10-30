// V2, step 1 — a side panel: pick the app, then the basics. Setup continues on the app's page.
import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { newApp, type LibraryApp } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'
import {
  AppIcon,
  AppPicker,
  Banner,
  GeneralForm,
  LicenseBanner,
  keepInlineEscape,
  useConfirmClose,
  type PickedApp,
  type SourceKey,
} from './forms'

export function CreateAppDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (app: LibraryApp) => void }) {
  const { apps, builds, categories, createCategory, addApp } = useAppLibrary()
  const [source, setSource] = useState<SourceKey>('store')
  const [picked, setPicked] = useState<PickedApp | null>(null)
  const [draft, setDraft] = useState<LibraryApp | null>(null)
  const { requestClose, dialog } = useConfirmClose(!!draft, onClose)
  const dupes = draft ? apps.filter((a) => a.bundleId === draft.bundleId && a.platform === draft.platform).length : 0

  const pick = (p: PickedApp | null) => {
    setPicked(p)
    setDraft(p ? newApp({ ...p, status: 'Draft' }) : null)
  }
  const create = () => {
    if (!draft) return
    // List it in Self Service under the category picked here, unless Self Service was already set.
    const displayIn = draft.selfService.displayIn.length || !draft.categoryId ? draft.selfService.displayIn : [draft.categoryId]
    const app = { ...draft, selfService: { ...draft.selfService, displayIn }, history: [{ at: new Date().toISOString(), who: 'Abhijeet', what: 'Created as draft' }] }
    addApp(app)
    onCreated(app)
  }

  return (
    <Sheet open onOpenChange={(o) => !o && requestClose()}>
      <SheetContent side="right" onEscapeKeyDown={keepInlineEscape} className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">Add app</SheetTitle>
          <SheetDescription>Saved as a draft. Nothing deploys until you're ready.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {draft ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                <AppIcon app={draft} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{picked!.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{draft.platform} · {draft.source} · {draft.bundleId}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => pick(null)}>Change</Button>
              </div>
              {dupes > 0 && (
                <Banner tone="warn">
                  Already in the library on {draft.platform} ({dupes} {dupes === 1 ? 'entry' : 'entries'}). This adds another entry.
                </Banner>
              )}
              <LicenseBanner app={draft} />
              <GeneralForm draft={draft} set={(p) => setDraft((d) => (d ? { ...d, ...p } : d))} categories={categories} onCreateCategory={createCategory} />
            </>
          ) : (
            <AppPicker source={source} onSource={setSource} value={picked} onPick={pick} builds={builds} existing={apps} />
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-6 py-3">
          <Button variant="ghost" onClick={requestClose}><X className="size-4" />Cancel</Button>
          <Button disabled={!draft?.name.trim()} onClick={create}>Create draft<ArrowRight className="size-4" /></Button>
        </SheetFooter>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}
