// The app's own page. A draft shows its setup checklist and Deploy; a deployed
// app shows a summary card and read-only tabs, each edited in a side panel.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, Package, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { AuditStamp, EmptyState } from '@/components/common'
import { deployCopy, reach } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'
import { DraftSetup } from '@/components/apps/DraftSetup'
import { AppDetailsView, AppIdentity, AppSummary, AppSummaryAlt, AppSummaryPlain } from '@/components/apps/AppDetailsView'
import { DesignCompare } from '@/components/apps/DesignCompare'
import { useHeaderDesign } from '@/lib/designVariant'

const BASE = '/mdm/apple/app-library'

export function AppSetupPage() {
  const { appId } = useParams()
  const navigate = useNavigate()
  // Prototype: four header designs, picked with the compare control.
  const [header] = useHeaderDesign()
  const { apps, updateApp, deleteApps } = useAppLibrary()
  const app = apps.find((a) => a.id === appId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [announce, setAnnounce] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const isDraft = app?.status === 'Draft'

  // The shell's <main> keeps its scroll between routes, so start each app at the top with focus on its name.
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0)
    heading.current?.focus()
  }, [appId])

  if (!app)
    return <EmptyState icon={Package} title="App not found" action={<Button asChild><Link to={BASE}>Back to App Library</Link></Button>} />

  const last = app.history[0]

  const deploy = () => {
    const { history } = deployCopy(app)
    updateApp({ ...app, status: 'Published' }, history)
    setAnnounce(history)
    // The Deploy button unmounts with the checklist; keep keyboard focus on the page.
    requestAnimationFrame(() => heading.current?.focus())
  }

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="More actions"><MoreVertical className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}><Trash2 className="size-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The name is in the header right below; this only needs to get you back. */}
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link to={BASE}><ArrowLeft className="size-4" />App Library</Link>
        </Button>
        {!isDraft && <DesignCompare />}
      </div>

      {isDraft || header === 'classic' ? (
        <AppIdentity app={app} actions={menu} headingRef={heading} />
      ) : header === 'classic-v2' ? (
        <AppSummaryPlain app={app} actions={menu} headingRef={heading} />
      ) : header === 'revamped-v2' ? (
        <AppSummaryAlt app={app} actions={menu} headingRef={heading} />
      ) : (
        <AppSummary app={app} actions={menu} headingRef={heading} />
      )}

      {/* Changes made here carry a full timestamp; seeded history is date-only. */}
      {last?.at.includes('T') && <AuditStamp at={last.at} by={last.who} />}
      <p role="status" className="sr-only">{announce}</p>

      {isDraft ? <DraftSetup app={app} onDeploy={deploy} /> : <AppDetailsView app={app} />}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {app.name}?</AlertDialogTitle>
            <AlertDialogDescription>{isDraft ? 'This draft was never deployed.' : `Removes it from ${reach(app)} devices.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { deleteApps(new Set([app.id])); navigate(BASE) }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
