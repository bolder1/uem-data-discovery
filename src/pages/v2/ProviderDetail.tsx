import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Plus,
  DatabaseZap,
  ShieldCheck,
  FileSearch,
  MoreHorizontal,
  Trash2,
  PlugZap,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Check,
  Database,
  ScanSearch,
  Pencil,
} from 'lucide-react'
import { providerById, providers } from '@/data'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  ProviderIcon,
  ConnectionStatusBadge,
  MaskedSecret,
  AuditStamp,
  EmptyState,
} from '@/components/common'
import { PolicyTable, ScopeTable, FindingsTable } from '@/components/v2/tables'
import { ConfigureDrawer } from '@/components/v2/ConfigureDrawer'
import { useRunScanDialog } from '@/components/v2/RunScanDialog'
import type { Configuration, Policy } from '@/types'

export function ProviderDetail({
  providerId: propProviderId,
}: {
  providerId?: string
  embedded?: boolean
} = {}) {
  const params = useParams()
  const providerId = propProviderId ?? params.provider
  const navigate = useNavigate()
  const provider = providerId ? providerById(providerId) : undefined
  const { configurations, policies, findings, deleteConfiguration } =
    useDataDiscovery()
  const { start: startScan, dialog: runScanDialog } = useRunScanDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'configurations'
  const setTab = (v: string) =>
    setSearchParams(
      (p) => {
        p.set('tab', v)
        return p
      },
      { replace: true },
    )
  const [addOpen, setAddOpen] = useState(false)
  const [editConfig, setEditConfig] = useState<Configuration | null>(null)

  if (!provider || provider.comingSoon) {
    return (
      <div className="pt-10">
        <EmptyState
          icon={DatabaseZap}
          title="Source not available"
          description="This data source is not available in the prototype yet."
          action={
            <Button asChild>
              <Link to="/data-discovery/sources">Back to data sources</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const configs = configurations.filter((c) => c.providerId === provider.id)
  const configIds = new Set(configs.map((c) => c.id))
  const providerPolicies = policies.filter((p) => configIds.has(p.configurationId))
  const providerFindings = findings.filter((f) => configIds.has(f.configurationId))
  const scopeRows = configs.flatMap((c) =>
    c.scopes.map((scope) => ({ scope, configName: c.name })),
  )
  const findingCount = (scopeId: string) =>
    findings.filter((f) => f.scopeId === scopeId).length

  const header = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            to="/data-discovery"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ScanSearch className="size-4 text-muted-foreground" />
            Data Discovery
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            to="/data-discovery/sources"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Database className="size-4 text-muted-foreground" />
            Data Sources
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <ProviderIcon
                  providerId={provider.id}
                  bare
                  className="text-muted-foreground"
                />
                {provider.name}
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 w-60 overflow-y-auto"
            >
              {providers.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  disabled={p.comingSoon}
                  onClick={() => navigate(`/data-discovery/sources/${p.id}`)}
                  className="gap-2"
                >
                  <ProviderIcon
                    providerId={p.id}
                    bare
                    className="text-muted-foreground"
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === provider.id && <Check className="size-4 text-brand" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <Button onClick={() => setAddOpen(true)} className="transition-transform active:scale-95">
          <Plus className="size-4" />
          Add configuration
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{provider.description}</p>
    </div>
  )

  if (configs.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={DatabaseZap}
          title={`No ${provider.name} connections yet`}
          description={`Add a configuration to connect a ${provider.vendor} account. Once connected, ${provider.scopeNounPlural.toLowerCase()} are discovered and ready to scan.`}
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add configuration
            </Button>
          }
        />
        <ConfigureDrawer
          provider={provider}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      </div>
    )
  }

  const onRun = (policy: Policy) => {
    startScan(policy.id, policy.name)
  }

  return (
    <div className="space-y-6">
      {header}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="configurations">
            Configurations
            <span className="ml-1.5 text-xs text-muted-foreground">
              {configs.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="scopes">{provider.scopeNounPlural}</TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-4">
          {configs.map((cfg) => (
            <ConfigCard
              key={cfg.id}
              cfg={cfg}
              onDelete={deleteConfiguration}
              onEdit={() => setEditConfig(cfg)}
              dependentPolicyCount={
                policies.filter((p) => p.configurationId === cfg.id).length
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="policies">
          {providerPolicies.length ? (
            <Card className="p-0">
              <PolicyTable
                policies={providerPolicies}
                showSource={false}
                onRun={onRun}
              />
            </Card>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No policies target this source"
              description="Create a policy to define which file types and classifications to scan for."
              action={
                <Button asChild>
                  <Link to="/data-discovery/policies/new">Create policy</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="results">
          {providerFindings.length ? (
            <Card className="gap-0 p-0">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <p className="text-sm font-medium">
                  {providerFindings.length} sensitive files discovered
                </p>
                <Button asChild variant="ghost" size="sm">
                  <Link
                    to="/data-discovery/results"
                    state={{
                      from: `/data-discovery/sources/${provider.id}`,
                      fromLabel: provider.name,
                    }}
                  >
                    Open in Results
                  </Link>
                </Button>
              </div>
              <FindingsTable findings={providerFindings} />
            </Card>
          ) : (
            <EmptyState
              icon={FileSearch}
              title="No findings yet"
              description="Run a scan against this source to surface sensitive data."
            />
          )}
        </TabsContent>

        <TabsContent value="scopes">
          <Card className="p-0">
            <ScopeTable
              rows={scopeRows}
              noun={provider.scopeNoun === 'bucket' ? 'Bucket' : provider.scopeNoun === 'container' ? 'Container' : provider.scopeNounPlural}
              findingCount={findingCount}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <ConfigureDrawer
        provider={provider}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      {editConfig && (
        <ConfigureDrawer
          provider={provider}
          editConfig={editConfig}
          open
          onOpenChange={(o) => {
            if (!o) setEditConfig(null)
          }}
        />
      )}

      {runScanDialog}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono text-sm text-foreground">
        {value ?? '—'}
      </p>
    </div>
  )
}

function ConfigCard({
  cfg,
  onDelete,
  onEdit,
  dependentPolicyCount,
}: {
  cfg: Configuration
  onDelete: (id: string) => void
  onEdit: () => void
  dependentPolicyCount: number
}) {
  const isAzure = cfg.providerId === 'azure-blob'
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [test, setTest] = useState<'idle' | 'testing' | 'ok'>('idle')
  const runTest = () => {
    setTest('testing')
    setTimeout(() => setTest('ok'), 1200)
  }
  return (
    <Card className="gap-0 p-0 transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-2 hover:border-brand/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProviderIcon providerId={cfg.providerId} size="md" />
          <div>
            <p className="font-semibold text-foreground">{cfg.name}</p>
            <ConnectionStatusBadge status={cfg.status} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">
            {cfg.scopes.length}{' '}
            {isAzure ? 'containers' : 'buckets'}
          </span>
          {test === 'ok' && (
            <span className="hidden items-center gap-1 text-xs font-medium text-emerald-700 sm:inline-flex">
              <CheckCircle2 className="size-3.5" />
              Healthy
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={runTest}
            disabled={test === 'testing'}
          >
            {test === 'testing' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PlugZap className="size-3.5" />
            )}
            {test === 'testing' ? 'Testing…' : 'Run Test'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  onEdit()
                }}
              >
                <Pencil className="size-4" />
                Edit configuration
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  setConfirmOpen(true)
                }}
              >
                <Trash2 className="size-4" />
                Remove connection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove connection?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{cfg.name}” will be removed. {dependentPolicyCount}{' '}
                  {dependentPolicyCount === 1 ? 'policy targets' : 'policies target'}{' '}
                  this connection and will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(cfg.id)}>
                  Remove connection
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {isAzure ? (
          <>
            <Field label="Storage account" value={cfg.storageAccount} />
            <Field label="Tenant ID" value={cfg.tenantId} />
            <Field label="Client ID" value={cfg.clientId} />
            <Field label="Endpoint suffix" value={cfg.endpointSuffix} />
          </>
        ) : (
          <>
            <Field label="Access key ID" value={cfg.accessKeyId} />
            <Field label="Region" value={cfg.region} />
          </>
        )}
        <div>
          <p className="text-xs text-muted-foreground">
            {isAzure ? 'Client secret' : 'Secret access key'}
          </p>
          <div className="mt-0.5">
            <MaskedSecret
              value={
                (isAzure ? cfg.clientSecretMasked : cfg.secretAccessKeyMasked) ??
                '••••••••'
              }
              source={isAzure ? 'Entra app' : 'IAM user'}
              lastRotated={cfg.lastRotated}
            />
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-3">
        <AuditStamp at={cfg.createdAt} by={cfg.createdBy} />
      </div>
    </Card>
  )
}
