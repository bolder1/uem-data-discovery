import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutGrid,
  MonitorSmartphone,
  SlidersHorizontal,
  Package,
  Lock,
  ShieldCheck,
  KeyRound,
  Trash2,
  Settings2,
  Info,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common'
import { cn } from '@/lib/utils'

const STEPS = ['Name & Priority', 'Configuration Settings', 'Device Groups']

interface Category {
  id: string
  label: string
  icon: LucideIcon
}
const CATEGORIES: Category[] = [
  { id: 'app-catalog', label: 'App Catalog', icon: LayoutGrid },
  { id: 'kiosk', label: 'Kiosk', icon: MonitorSmartphone },
  { id: 'device-func', label: 'Device Functionalities', icon: SlidersHorizontal },
  { id: 'os-patch', label: 'OS Patch Management', icon: Package },
  { id: 'bitlocker', label: 'BitLocker (CSP)', icon: Lock },
  { id: 'defender', label: 'Defender Security', icon: ShieldCheck },
  { id: 'password', label: 'Password Policy', icon: KeyRound },
]

type AppSource = 'store' | 'custom'
interface CatalogApp {
  id: string
  name: string
  publisher: string
  source: string
  type: AppSource
  versions: string[]
  iconUrl?: string
  tint: string
}
const CATALOG_APPS: CatalogApp[] = [
  // Microsoft Store apps
  { id: 'outlook', name: 'Outlook for Windows', publisher: 'Microsoft Corporation', source: 'MS Store', type: 'store', tint: 'bg-blue-100 text-blue-700', versions: ['1.2024.925', '1.2024.820', '1.2024.715'] },
  { id: 'teams', name: 'Microsoft Teams', publisher: 'Microsoft Corporation', source: 'MS Store', type: 'store', tint: 'bg-violet-100 text-violet-700', versions: ['24165.1414', '24152.1010'] },
  { id: 'slack', name: 'Slack', publisher: 'Slack Technologies Inc.', source: 'MS Store', type: 'store', tint: 'bg-fuchsia-100 text-fuchsia-700', versions: ['4.41.98', '4.40.126'] },
  { id: 'firefox', name: 'Mozilla Firefox', publisher: 'Mozilla', source: 'MS Store', type: 'store', iconUrl: '/app-icons/firefox.svg', tint: 'bg-orange-100 text-orange-700', versions: ['128.2.0', '128.0.0', '115.14.0'] },
  { id: 'zoom', name: 'Zoom Workplace', publisher: 'Zoom Video Communications', source: 'MS Store', type: 'store', iconUrl: '/app-icons/zoom.svg', tint: 'bg-sky-100 text-sky-700', versions: ['6.1.5', '6.0.10'] },
  // Custom / uploaded enterprise apps (have pinnable versions)
  { id: 'vpn', name: 'Company VPN Client', publisher: 'Cisco Systems, Inc.', source: 'MSI', type: 'custom', iconUrl: '/app-icons/vpn.svg', tint: 'bg-cyan-100 text-cyan-700', versions: ['3.2.0', '3.1.4', '3.0.9'] },
  { id: 'zoomrooms', name: 'Zoom Rooms Installer', publisher: 'Zoom', source: 'MSI', type: 'custom', iconUrl: '/app-icons/zoom.svg', tint: 'bg-sky-100 text-sky-700', versions: ['7.1.6', '6.0.7'] },
  { id: 'toolkit', name: 'Internal IT Toolkit', publisher: 'IT Operations', source: 'MSI', type: 'custom', tint: 'bg-slate-200 text-slate-700', versions: ['2.4.0', '2.3.1', '2.2.0'] },
]

const DEVICE_GROUPS = [
  'All Windows Devices',
  'Sales Laptops',
  'Engineering Workstations',
  'Kiosk Devices',
  'Finance BYOD',
]

export function ApplicationPolicies() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // opens on Configuration Settings (matches the reference)
  const [category, setCategory] = useState('app-catalog')
  const [catalogOn, setCatalogOn] = useState(true)
  const [appTab, setAppTab] = useState<AppSource>('store')
  const [added, setAdded] = useState<Set<string>>(new Set(['outlook']))
  const [versionMap, setVersionMap] = useState<Record<string, string>>({})
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [country, setCountry] = useState('US')
  const [appQuery, setAppQuery] = useState('')
  const [catQuery, setCatQuery] = useState('')
  const [name, setName] = useState('')
  const [priority, setPriority] = useState('1')
  const [groups, setGroups] = useState<Set<string>>(new Set(['All Windows Devices']))

  const back = () => navigate('/application-management')

  const toggleApp = (id: string) =>
    setAdded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const toggleGroup = (g: string) =>
    setGroups((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  const pinnedVersion = (a: CatalogApp) => versionMap[a.id] ?? a.versions[0]

  const addedApps = CATALOG_APPS.filter((a) => a.type === appTab && added.has(a.id))
  const shownCats = CATEGORIES.filter(
    (c) => !catQuery || c.label.toLowerCase().includes(catQuery.toLowerCase()),
  )
  const shownApps = CATALOG_APPS.filter(
    (a) => a.type === appTab && (!appQuery || a.name.toLowerCase().includes(appQuery.toLowerCase())),
  )
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Mobile Device Management' },
          { label: 'Application Management', to: '/application-management' },
          { label: 'Policies' },
        ]}
        title="Windows Management Policies"
        description="Configure and manage your organization's agentless MDM settings for Windows devices."
      />

      <PolicyStepper step={step} onGo={setStep} />

      {step === 0 && (
        <NamePriorityStep
          name={name}
          onName={setName}
          priority={priority}
          onPriority={setPriority}
        />
      )}

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* left — category list */}
          <Card className="gap-0 p-0">
            <div className="border-b p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={catQuery}
                  onChange={(e) => setCatQuery(e.target.value)}
                  placeholder="Search by Category"
                  className="h-9 pl-8"
                />
              </div>
            </div>
            <nav className="space-y-0.5 p-2">
              {shownCats.map((c) => {
                const Icon = c.icon
                const on = c.id === category
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      on
                        ? 'bg-brand/10 font-medium text-brand'
                        : 'text-foreground hover:bg-secondary',
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', !on && 'text-muted-foreground')} />
                    <span className="truncate">{c.label}</span>
                  </button>
                )
              })}
            </nav>
          </Card>

          {/* right — the selected category (App Catalog) config */}
          <Card className="gap-0 overflow-hidden p-0">
            {/* App Catalog heading + toggle — spans the whole section */}
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <span className="text-sm font-semibold text-foreground">{categoryLabel}</span>
              <Switch checked={catalogOn} onCheckedChange={setCatalogOn} />
            </div>

            {category === 'app-catalog' ? (
              <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                {/* Applications */}
                <div className="min-w-0">
                  <div className="flex gap-6 border-b px-4">
                    <CatalogTab active={appTab === 'store'} onClick={() => setAppTab('store')}>
                      Store apps
                    </CatalogTab>
                    <CatalogTab active={appTab === 'custom'} onClick={() => setAppTab('custom')}>
                      MSI Apps
                    </CatalogTab>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-2 text-sm font-medium text-foreground">
                      Applications ({addedApps.length})
                      <Info className="size-3.5 text-muted-foreground" />
                    </div>
                    {addedApps.length === 0 ? (
                      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                        No {appTab === 'store' ? 'store' : 'custom'} apps added yet. Add apps
                        from the search on the right.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {addedApps.map((a) => {
                          const expanded = expandedApp === a.id
                          return (
                            <div key={a.id} className="overflow-hidden rounded-lg border">
                              <div className="flex items-center gap-3 px-3 py-2.5">
                                <CatalogIcon app={a} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {a.name}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    Version {pinnedVersion(a)}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="shrink-0 font-medium">
                                  {a.source}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => setExpandedApp(expanded ? null : a.id)}
                                  aria-label={`Select version for ${a.name}`}
                                  aria-expanded={expanded}
                                  className={cn(
                                    'shrink-0 rounded-md p-1.5 transition-colors',
                                    expanded
                                      ? 'bg-secondary text-foreground'
                                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                                  )}
                                >
                                  <Settings2 className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleApp(a.id)}
                                  aria-label={`Remove ${a.name}`}
                                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                              {expanded && (
                                <div className="border-t bg-secondary/30 px-3 py-2.5">
                                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                    Select version
                                  </p>
                                  <div className="space-y-0.5">
                                    {a.versions.map((v, i) => {
                                      const on = v === pinnedVersion(a)
                                      return (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() =>
                                            setVersionMap((m) => ({ ...m, [a.id]: v }))
                                          }
                                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                                        >
                                          <span
                                            className={cn(
                                              'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                                              on ? 'border-brand' : 'border-input',
                                            )}
                                          >
                                            {on && (
                                              <span className="size-1.5 rounded-full bg-brand" />
                                            )}
                                          </span>
                                          <span className="flex-1 tabular-nums text-foreground">
                                            {v}
                                          </span>
                                          {i === 0 && (
                                            <Badge variant="secondary" className="text-[10px]">
                                              Latest
                                            </Badge>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Applications */}
                <div className="min-w-0">
                  <div className="flex h-[45px] items-center gap-1.5 border-b px-4 text-sm font-semibold text-foreground">
                    Search Applications
                    <Info className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={appQuery}
                          onChange={(e) => setAppQuery(e.target.value)}
                          placeholder="Search for apps…"
                          className="h-9 pl-8"
                        />
                      </div>
                      {appTab === 'store' && (
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="h-9 w-24 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">🇺🇸 US</SelectItem>
                            <SelectItem value="UK">🇬🇧 UK</SelectItem>
                            <SelectItem value="IN">🇮🇳 IN</SelectItem>
                            <SelectItem value="DE">🇩🇪 DE</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">
                        {appTab === 'store' ? 'Popular Applications' : 'Custom applications'}
                      </p>
                      <div className="space-y-1">
                        {shownApps.map((a) => {
                          const on = added.has(a.id)
                          return (
                            <div key={a.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
                              <CatalogIcon app={a} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {a.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {a.publisher}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant={on ? 'outline' : 'default'}
                                className={cn(
                                  'shrink-0',
                                  on && 'border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive',
                                )}
                                onClick={() => toggleApp(a.id)}
                              >
                                {on ? 'Remove' : 'Add'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-52 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                {categoryLabel} settings will appear here.
              </div>
            )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card className="max-w-xl gap-0 p-0">
          <div className="border-b px-4 py-3 text-sm font-semibold text-foreground">
            Assign to device groups
          </div>
          <div className="space-y-1 p-2">
            {DEVICE_GROUPS.map((g) => (
              <label
                key={g}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition-colors hover:bg-secondary"
              >
                <Checkbox
                  checked={groups.has(g)}
                  onCheckedChange={() => toggleGroup(g)}
                  aria-label={`Assign ${g}`}
                />
                <span className="font-medium text-foreground">{g}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={back}>
            <X className="size-4" />
            Cancel
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={back}>
              <Check className="size-4" />
              Save policy
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function CatalogTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-1 pb-2.5 pt-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function PolicyStepper({ step, onGo }: { step: number; onGo: (i: number) => void }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <Fragment key={label}>
            <button
              type="button"
              onClick={() => onGo(i)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                done
                  ? 'border-emerald-500 text-emerald-600'
                  : active
                    ? 'border-brand text-brand'
                    : 'border-border text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-brand text-brand-foreground'
                      : 'bg-secondary text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn('h-0.5 flex-1', done ? 'bg-emerald-500' : 'bg-border')}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

function NamePriorityStep({
  name,
  onName,
  priority,
  onPriority,
}: {
  name: string
  onName: (v: string) => void
  priority: string
  onPriority: (v: string) => void
}) {
  return (
    <Card className="max-w-xl gap-0 p-0">
      <div className="border-b px-4 py-3 text-sm font-semibold text-foreground">
        Name &amp; Priority
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Policy name</label>
          <Input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="e.g. Standard Windows Baseline"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Priority</label>
          <Input
            type="number"
            min={1}
            value={priority}
            onChange={(e) => onPriority(e.target.value)}
            className="max-w-32"
          />
          <p className="text-xs text-muted-foreground">
            Lower numbers take precedence when policies conflict.
          </p>
        </div>
      </div>
    </Card>
  )
}

function CatalogIcon({ app }: { app: CatalogApp }) {
  if (app.iconUrl) {
    return (
      <img
        src={app.iconUrl}
        alt=""
        className="size-8 shrink-0 rounded-md border border-black/5 bg-white object-cover"
      />
    )
  }
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold',
        app.tint,
      )}
    >
      {app.name.charAt(0)}
    </span>
  )
}
