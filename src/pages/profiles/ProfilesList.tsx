// MDM → Apple → Profiles. One list, two kinds, switched by "Profile type":
//  - Configuration profiles: Edit opens a full page (ConfigProfileEditor).
//  - Onboarding profiles: Edit opens a side sheet (OnboardingSheet).
// OS tab, type and search all live in the URL so back/links keep the view.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileCog, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader, EmptyState } from '@/components/common'
import { OnboardingSheet } from '@/components/profiles/OnboardingSheet'
import { useProfiles } from '@/store/ProfilesContext'
import { blankOnboarding, osLabel, type AppleOs, type OnboardingProfile, type ProfileKind } from '@/data/profiles'
import { formatDate } from '@/lib/format'

export function ProfilesList() {
  const [params, setParams] = useSearchParams()
  const os = (params.get('os') === 'macos' ? 'macos' : 'ios') as AppleOs
  const kind = (params.get('view') === 'onboarding' ? 'onboarding' : 'configuration') as ProfileKind
  const query = params.get('q') ?? ''
  const navigate = useNavigate()
  const { configProfiles, onboardingProfiles, removeConfig, removeOnboarding } = useProfiles()

  const [editing, setEditing] = useState<OnboardingProfile | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  const set = (patch: Record<string, string | null>) =>
    setParams((p) => {
      Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
      return p
    }, { replace: true })

  const q = query.trim().toLowerCase()
  const match = (name: string) => !q || name.toLowerCase().includes(q)
  const configRows = configProfiles.filter((p) => p.os === os && match(p.name))
  const onboardingRows = onboardingProfiles.filter((p) => p.os === os && match(p.name))
  const count = kind === 'configuration' ? configRows.length : onboardingRows.length

  const create = () =>
    kind === 'configuration' ? navigate(`/mdm/apple/profiles/new?os=${os}`) : setEditing(blankOnboarding(os))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apple Profiles"
        description={kind === 'configuration'
          ? 'Configuration profiles push settings, passcode rules and restrictions to Apple devices.'
          : 'Onboarding profiles decide how new Apple devices enroll and which Setup Assistant screens they skip.'}
      />

      <Tabs value={os} onValueChange={(v) => set({ os: v === 'ios' ? null : v })}>
        <TabsList variant="line">
          <TabsTrigger value="ios">{osLabel.ios}</TabsTrigger>
          <TabsTrigger value="macos">{osLabel.macos}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => set({ q: e.target.value || null })} placeholder="Search by profile name" className="pl-9" aria-label="Search profiles" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={kind} onValueChange={(v) => set({ view: v === 'configuration' ? null : v })}>
            <SelectTrigger className="w-[250px]" aria-label="Profile type">
              <span className="text-muted-foreground">Type:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="configuration">Configuration profile</SelectItem>
              <SelectItem value="onboarding">Onboarding profile</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create}><Plus className="size-4" />Create profile</Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        {count === 0 ? (
          <EmptyState
            icon={FileCog}
            className="m-4 border-0"
            title={q ? 'No profiles match your search' : `No ${kind} profiles for ${osLabel[os]}`}
            description={q ? 'Try a different name.' : 'Create one to start managing these devices.'}
            action={!q ? <Button onClick={create}><Plus className="size-4" />Create profile</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                {kind === 'configuration' ? (
                  <>
                    <TableHead>Payloads</TableHead>
                    <TableHead>Targets</TableHead>
                    <TableHead>Last updated</TableHead>
                  </>
                ) : (
                  <TableHead>Device group</TableHead>
                )}
                <TableHead className="w-16 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kind === 'configuration'
                ? configRows.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/mdm/apple/profiles/${p.id}`)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.description || '—'}</TableCell>
                      <TableCell className="tabular-nums">{p.payloads.length}</TableCell>
                      <TableCell>{p.allDevices ? `All ${osLabel[p.os]} devices` : p.includedTargets.length ? `${p.includedTargets.length} included` : <span className="text-muted-foreground">None</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.updatedAt)}</TableCell>
                      <RowMenu
                        onEdit={() => navigate(`/mdm/apple/profiles/${p.id}`)}
                        onDelete={() => setDeleting({ id: p.id, name: p.name })}
                      />
                    </TableRow>
                  ))
                : onboardingRows.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setEditing(p)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.description || '—'}</TableCell>
                      <TableCell>{p.deviceGroup}</TableCell>
                      <RowMenu onEdit={() => setEditing(p)} onDelete={() => setDeleting({ id: p.id, name: p.name })} />
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}
        {count > 0 && (
          <div className="border-t px-4 py-2 text-sm text-muted-foreground tabular-nums">
            {count} {count === 1 ? 'profile' : 'profiles'}
          </div>
        )}
      </Card>

      {editing && <OnboardingSheet profile={editing} onClose={() => setEditing(null)} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Devices that have this profile lose its settings at their next check-in. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!deleting) return
                if (kind === 'configuration') removeConfig(deleting.id)
                else removeOnboarding(deleting.id)
                setDeleting(null)
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

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Row actions"><MoreVertical className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}><Pencil className="size-4" />Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 className="size-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  )
}
