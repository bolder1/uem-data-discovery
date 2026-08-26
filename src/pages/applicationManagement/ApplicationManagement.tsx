import { useMemo, useState, type ReactNode } from 'react'
import { useApplicationManagement } from '@/store/ApplicationManagementContext'
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
import type { AppPlatform, ManagedApp } from '@/types'
import { UploadAppDrawer } from '@/components/applicationManagement/UploadAppDrawer'
import { AppDetailsDrawer } from '@/components/applicationManagement/AppDetailsDrawer'
import { AssignPoliciesDrawer } from '@/components/applicationManagement/AssignPoliciesDrawer'
import { ProductView } from '@/components/applicationManagement/ProductView'
import { CardsView } from '@/components/applicationManagement/CardsView'
import { WorkspaceView } from '@/components/applicationManagement/WorkspaceView'
import type {
  AppMgmtViewProps,
  AppView,
  ConfirmTarget,
} from '@/components/applicationManagement/appMgmtView'

const VIEW_COMPONENTS: Record<
  AppView,
  (props: AppMgmtViewProps) => ReactNode
> = {
  table: ProductView,
  cards: CardsView,
  workspace: WorkspaceView,
}

export function ApplicationManagement() {
  const { apps, appPolicies, deleteApp, deleteVersion, deleteApps } =
    useApplicationManagement()

  const [view, setView] = useState<AppView>('workspace')
  const [os, setOs] = useState<AppPlatform>('windows')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploadOpen, setUploadOpen] = useState(false)
  const [update, setUpdate] = useState<ManagedApp | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [assignApp, setAssignApp] = useState<ManagedApp | null>(null)
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [recentId, setRecentId] = useState<string | null>(null)

  const winCount = apps.filter((a) => a.platform === 'windows').length
  const macCount = apps.filter((a) => a.platform === 'macos').length

  const q = query.trim().toLowerCase()
  const rows = useMemo(
    () =>
      apps.filter(
        (a) =>
          a.platform === os &&
          (!q || `${a.name} ${a.publisher}`.toLowerCase().includes(q)),
      ),
    [apps, os, q],
  )

  const detailsApp = apps.find((a) => a.id === detailsId) ?? null

  const summary = {
    total: apps.length,
    assigned: apps.filter((a) => (a.policyIds ?? []).length > 0).length,
    unassigned: apps.filter((a) => (a.policyIds ?? []).length === 0).length,
    devices: apps.reduce((n, a) => n + (a.versions[0]?.installedDevices ?? 0), 0),
  }

  const switchOs = (next: AppPlatform) => {
    setOs(next)
    setSelected(new Set())
  }

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someVisibleSelected = rows.some((r) => selected.has(r.id))
  const toggleAll = () =>
    setSelected(() =>
      allVisibleSelected ? new Set() : new Set(rows.map((r) => r.id)),
    )
  const clearSel = () => setSelected(new Set())

  const flashRecent = (id: string) => {
    setRecentId(id)
    setTimeout(() => setRecentId((cur) => (cur === id ? null : cur)), 2500)
  }

  const onUploaded = (app: ManagedApp) => {
    switchOs(app.platform)
    flashRecent(app.id)
  }

  const openUpdate = (app: ManagedApp) => {
    setDetailsId(null)
    setUpdate(app)
  }

  const runConfirm = () => {
    if (!confirm) return
    if (confirm.kind === 'app') deleteApp(confirm.app.id)
    else if (confirm.kind === 'version')
      deleteVersion(confirm.app.id, confirm.version.id)
    else {
      deleteApps(confirm.ids)
      clearSel()
    }
    setConfirm(null)
  }

  // Cards + Workspace use the design-system drawers; only the Table (Product UI)
  // re-skins them to match the live product.
  const skin = view === 'table' ? 'product' : undefined

  const vm: AppMgmtViewProps = {
    view,
    onChangeView: (v) => {
      setView(v)
      clearSel()
    },
    os,
    onSwitchOs: switchOs,
    winCount,
    macCount,
    query,
    onQueryChange: setQuery,
    rows,
    summary,
    appPolicies,
    recentId,
    selected,
    onToggleRow: toggleRow,
    onToggleAll: toggleAll,
    allVisibleSelected,
    someVisibleSelected,
    onClearSelection: clearSel,
    selectedIds: [...selected],
    onUpload: () => setUploadOpen(true),
    onOpenDetails: (id) => setDetailsId(id),
    onOpenUpdate: openUpdate,
    onAssign: (app) => {
      setDetailsId(null)
      setAssignApp(app)
    },
    onRequestDelete: setConfirm,
  }

  const ActiveView = VIEW_COMPONENTS[view]

  return (
    <>
      <ActiveView {...vm} />

      {/* upload (new app) */}
      {uploadOpen && (
        <UploadAppDrawer
          platform={os}
          open
          skin={skin}
          onOpenChange={setUploadOpen}
          onUploaded={onUploaded}
        />
      )}

      {/* update (new version of an existing app) */}
      {update && (
        <UploadAppDrawer
          platform={update.platform}
          updateApp={update}
          open
          skin={skin}
          onOpenChange={(o) => !o && setUpdate(null)}
          onUploaded={onUploaded}
        />
      )}

      {/* details */}
      <AppDetailsDrawer
        key={detailsId}
        app={detailsApp}
        skin={skin}
        onOpenChange={(o) => !o && setDetailsId(null)}
        onUpdate={openUpdate}
        onRequestDeleteApp={(app) => {
          setDetailsId(null)
          setConfirm({ kind: 'app', app })
        }}
        onRequestDeleteVersion={(app, version) => {
          setDetailsId(null)
          setConfirm({ kind: 'version', app, version })
        }}
      />

      {/* assign policies (profile) */}
      <AssignPoliciesDrawer
        key={assignApp?.id ?? 'assign'}
        app={assignApp}
        skin={skin}
        onOpenChange={(o) => !o && setAssignApp(null)}
      />

      {/* delete confirm — app, version, or bulk */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent data-skin={skin}>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle(confirm)}</AlertDialogTitle>
            <AlertDialogDescription>{confirmBody(confirm)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={runConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function confirmTitle(c: ConfirmTarget | null): string {
  if (!c) return ''
  if (c.kind === 'app') return 'Delete this application?'
  if (c.kind === 'version') return 'Delete this version?'
  return `Delete ${c.ids.length} ${c.ids.length === 1 ? 'application' : 'applications'}?`
}

function confirmBody(c: ConfirmTarget | null): string {
  if (!c) return ''
  if (c.kind === 'app')
    return `“${c.app.name}” and all its versions will be removed from Application Management and unpublished from every device it’s on. This can’t be undone.`
  if (c.kind === 'version') {
    const last = c.app.versions.length === 1
    return `App Version ${c.version.version} of “${c.app.name}” will be removed and unpublished from every device it’s on.${last ? ' It is the only version, so the application will be removed entirely.' : ''} This can’t be undone.`
  }
  return 'The selected applications will be removed and unpublished from every device they’re on. This can’t be undone.'
}
