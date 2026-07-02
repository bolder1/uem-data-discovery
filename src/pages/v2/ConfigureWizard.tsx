import { useMemo, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  PlugZap,
  ChevronDown,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { providerById } from '@/data'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PageHeader,
  Stepper,
  AuditStamp,
  ProviderIcon,
  DiscardDraftDialog,
} from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Scope } from '@/types'

interface Candidate {
  id: string
  name: string
  objects: number
  sensitive: number
  sizeBytes: number
  publicAccess: boolean
}

const AZURE_CANDIDATES: Candidate[] = [
  { id: 'c-hr', name: 'hr-confidential', objects: 12, sensitive: 9, sizeBytes: 240500, publicAccess: false },
  { id: 'c-fin', name: 'finance-2026', objects: 40, sensitive: 31, sizeBytes: 5204888, publicAccess: false },
  { id: 'c-mkt', name: 'public-marketing', objects: 88, sensitive: 2, sizeBytes: 18204880, publicAccess: true },
  { id: 'c-bak', name: 'db-backups', objects: 5, sensitive: 5, sizeBytes: 920400000, publicAccess: false },
]

const AWS_CANDIDATES: Candidate[] = [
  { id: 'b-cust', name: 'customer-data', objects: 210, sensitive: 64, sizeBytes: 88204880, publicAccess: false },
  { id: 'b-inv', name: 'invoices', objects: 96, sensitive: 40, sizeBytes: 12048800, publicAccess: false },
  { id: 'b-pub', name: 'public-assets', objects: 512, sensitive: 3, sizeBytes: 2208049088, publicAccess: true },
  { id: 'b-logs', name: 'app-logs', objects: 1200, sensitive: 0, sizeBytes: 4408049088, publicAccess: false },
]

const AWS_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1']

const steps = [
  { key: 'creds', label: 'Credentials' },
  { key: 'test', label: 'Test connection' },
  { key: 'scope', label: 'Select scope' },
  { key: 'review', label: 'Review & save' },
]

export function ConfigureWizard() {
  const { provider: providerId } = useParams()
  const provider = providerId ? providerById(providerId) : undefined
  const navigate = useNavigate()
  const { addConfiguration, configurations } = useDataDiscovery()

  const isAzure = provider?.id === 'azure-blob'
  const candidates = isAzure ? AZURE_CANDIDATES : AWS_CANDIDATES

  const [step, setStep] = useState(0)
  const [showSecret, setShowSecret] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [test, setTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [selected, setSelected] = useState<Set<string>>(
    new Set(candidates.map((c) => c.id)),
  )
  const [saved, setSaved] = useState<{ id: string; at: string; by: string } | null>(
    null,
  )

  const [form, setForm] = useState({
    name: '',
    storageAccount: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    endpointSuffix: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
  })
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k !== 'name') setTest('idle')
  }

  const duplicateName = useMemo(
    () =>
      !!form.name.trim() &&
      configurations.some(
        (c) =>
          c.providerId === provider?.id &&
          c.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
      ),
    [configurations, provider?.id, form.name],
  )

  const credsValid = useMemo(() => {
    if (!form.name.trim()) return false
    if (duplicateName) return false
    return isAzure
      ? !!(form.storageAccount && form.tenantId && form.clientId && form.clientSecret)
      : !!(form.accessKeyId && form.secretAccessKey && form.region)
  }, [form, isAzure, duplicateName])

  // Warn before navigation discards an in-progress draft.
  const dirty =
    !saved &&
    [
      form.name,
      form.storageAccount,
      form.tenantId,
      form.clientId,
      form.clientSecret,
      form.accessKeyId,
      form.secretAccessKey,
    ].some((v) => v.trim() !== '')
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  if (!provider || provider.comingSoon) {
    return (
      <div className="pt-10 text-center text-sm text-muted-foreground">
        This data source is not available.{' '}
        <Link to="/data-discovery/sources" className="text-primary underline">
          Back to data sources
        </Link>
      </div>
    )
  }

  const runTest = () => {
    setTest('testing')
    const sentinel = isAzure ? form.storageAccount : form.accessKeyId
    const willFail = sentinel.toLowerCase().includes('fail')
    setTimeout(() => setTest(willFail ? 'error' : 'success'), 1300)
  }

  const toggleScope = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const canNext =
    step === 0 ? credsValid : step === 1 ? test === 'success' : step === 2 ? selected.size > 0 : true

  const handleSave = () => {
    const scopes: Scope[] = candidates
      .filter((c) => selected.has(c.id))
      .map((c) => ({
        id: `${provider.id}-${c.id}`,
        name: c.name,
        objects: c.objects,
        sensitive: c.sensitive,
        sizeBytes: c.sizeBytes,
        publicAccess: c.publicAccess,
      }))
    const cfg = addConfiguration({
      providerId: provider.id,
      name: form.name.trim(),
      scopes,
      ...(isAzure
        ? {
            storageAccount: form.storageAccount,
            tenantId: form.tenantId,
            clientId: form.clientId,
            clientSecretMasked: '••••••••••••••••',
            endpointSuffix: form.endpointSuffix || 'blob.core.windows.net',
          }
        : {
            accessKeyId: form.accessKeyId,
            secretAccessKeyMasked: '••••••••••••••••••••••••',
            region: form.region,
          }),
    })
    setSaved({ id: cfg.id, at: cfg.createdAt, by: cfg.createdBy })
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Card className="items-center gap-0 p-10 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {provider.name} connected
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            “{form.name}” is connected and {selected.size}{' '}
            {provider.scopeNounPlural.toLowerCase()} are ready to scan. Create a
            policy to start discovering sensitive data.
          </p>
          <div className="mt-5">
            <AuditStamp at={saved.at} by={saved.by} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to={`/data-discovery/sources/${provider.id}`}>
                View source
              </Link>
            </Button>
            <Button asChild>
              <Link to="/data-discovery/policies/new" state={{ configurationId: saved.id }}>
                <ShieldCheck className="size-4" />
                Create policy
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DiscardDraftDialog blocker={blocker} what="connection" />
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Data Sources', to: '/data-discovery/sources' },
          { label: provider.name, to: `/data-discovery/sources/${provider.id}` },
          { label: 'Add configuration' },
        ]}
        title={
          <span className="flex items-center gap-3">
            <ProviderIcon providerId={provider.id} size="md" />
            Add {provider.name} configuration
          </span>
        }
      />

      <Card className="p-6">
        <Stepper steps={steps} current={step} onStepClick={setStep} />
      </Card>

      <Card className="p-6">
        <div className="min-h-[300px]">
          {/* Step 1 — credentials */}
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Configuration name" required>
                <Input
                  placeholder="e.g. Production Storage Account"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
                {duplicateName && (
                  <p className="text-xs text-destructive">
                    A connection with this name already exists.
                  </p>
                )}
              </Field>

              {isAzure ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Storage account name" required>
                    <Input
                      placeholder="e.g. mystorageaccount"
                      value={form.storageAccount}
                      onChange={(e) => set('storageAccount', e.target.value)}
                    />
                  </Field>
                  <Field label="Tenant ID" required>
                    <Input
                      placeholder="Directory (tenant) ID"
                      value={form.tenantId}
                      onChange={(e) => set('tenantId', e.target.value)}
                    />
                  </Field>
                  <Field label="Client ID" required>
                    <Input
                      placeholder="Application (client) ID"
                      value={form.clientId}
                      onChange={(e) => set('clientId', e.target.value)}
                    />
                  </Field>
                  <Field label="Endpoint suffix">
                    <Input
                      placeholder="blob.core.windows.net"
                      value={form.endpointSuffix}
                      onChange={(e) => set('endpointSuffix', e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Client secret" required>
                      <SecretInput
                        value={form.clientSecret}
                        onChange={(v) => set('clientSecret', v)}
                        show={showSecret}
                        onToggle={() => setShowSecret((s) => !s)}
                        placeholder="Enter the client secret"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Access key ID" required>
                    <Input
                      placeholder="AKIA…"
                      value={form.accessKeyId}
                      onChange={(e) => set('accessKeyId', e.target.value)}
                    />
                  </Field>
                  <Field label="Region" required>
                    <Select
                      value={form.region}
                      onValueChange={(v) => set('region', v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AWS_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Secret access key" required>
                      <SecretInput
                        value={form.secretAccessKey}
                        onChange={(v) => set('secretAccessKey', v)}
                        show={showSecret}
                        onToggle={() => setShowSecret((s) => !s)}
                        placeholder="Enter the secret access key"
                      />
                    </Field>
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-secondary/40">
                <button
                  type="button"
                  onClick={() => setShowHelp((s) => !s)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                >
                  How to configure
                  <ChevronDown
                    className={cn(
                      'size-4 text-muted-foreground transition-transform',
                      showHelp && 'rotate-180',
                    )}
                  />
                </button>
                {showHelp && (
                  <ol className="list-decimal space-y-2 px-8 pb-4 text-sm text-muted-foreground">
                    {isAzure ? (
                      <>
                        <li>
                          In the Azure Portal, open <b>Microsoft Entra ID → App
                          registrations</b> and register an app. Copy its tenant
                          and client IDs.
                        </li>
                        <li>
                          Under <b>Certificates &amp; secrets</b>, create a client
                          secret and copy its value.
                        </li>
                        <li>
                          On the storage account, assign the{' '}
                          <b>Storage Blob Data Reader</b> role to the app.
                        </li>
                        <li>Enter the storage account name and leave the suffix blank for public cloud.</li>
                      </>
                    ) : (
                      <>
                        <li>
                          In the AWS console, create an IAM user with{' '}
                          <b>AmazonS3ReadOnlyAccess</b>.
                        </li>
                        <li>Generate an access key pair for that user.</li>
                        <li>Paste the access key ID and secret, and pick the bucket region.</li>
                      </>
                    )}
                  </ol>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — test connection */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div
                className={cn(
                  'mb-4 flex size-14 items-center justify-center rounded-full transition-colors',
                  test === 'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : test === 'error'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-secondary text-muted-foreground',
                )}
              >
                {test === 'testing' ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : test === 'success' ? (
                  <CheckCircle2 className="size-7" />
                ) : test === 'error' ? (
                  <AlertTriangle className="size-7" />
                ) : (
                  <PlugZap className="size-7" />
                )}
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {test === 'success'
                  ? 'Connection verified'
                  : test === 'error'
                    ? 'Connection failed'
                    : test === 'testing'
                      ? 'Verifying credentials…'
                      : 'Test the connection'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {test === 'success'
                  ? `We reached ${provider.name} and can list ${provider.scopeNounPlural.toLowerCase()}.`
                  : test === 'error'
                    ? `Couldn’t reach ${provider.name} — check the credentials and try again.`
                    : `We’ll validate the credentials against ${provider.name} before saving.`}
              </p>
              {test === 'error' && (
                <div className="mt-5 w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm text-destructive">
                  Couldn’t reach {provider.name} — check the credentials and try
                  again.
                </div>
              )}
              {test === 'error' ? (
                <Button className="mt-5" variant="outline" onClick={runTest}>
                  Retry
                </Button>
              ) : (
                test !== 'success' && (
                  <Button
                    className="mt-5"
                    onClick={runTest}
                    disabled={test === 'testing'}
                  >
                    {test === 'testing' ? 'Testing…' : 'Test connection'}
                  </Button>
                )
              )}
            </div>
          )}

          {/* Step 3 — select scope */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Select {provider.scopeNounPlural.toLowerCase()} to scan
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selected.size} of {candidates.length} selected
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() =>
                    setSelected(
                      selected.size === candidates.length
                        ? new Set()
                        : new Set(candidates.map((c) => c.id)),
                    )
                  }
                >
                  {selected.size === candidates.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {candidates.map((c) => {
                  const on = selected.has(c.id)
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                        on
                          ? 'border-brand/40 bg-brand/5'
                          : 'hover:border-border hover:bg-secondary/40',
                      )}
                    >
                      <Checkbox checked={on} onCheckedChange={() => toggleScope(c.id)} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {c.name}
                          </span>
                          {c.publicAccess && <ExposurePill public />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.objects} objects · {c.sensitive} sensitive ·{' '}
                          {formatBytes(c.sizeBytes)}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4 — review */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-foreground">
                Review configuration
              </h3>
              <div className="grid gap-4 rounded-lg border bg-secondary/30 p-4 sm:grid-cols-2">
                <Review label="Source" value={provider.name} />
                <Review label="Configuration name" value={form.name} />
                {isAzure ? (
                  <>
                    <Review label="Storage account" value={form.storageAccount} />
                    <Review label="Tenant ID" value={form.tenantId} mono />
                  </>
                ) : (
                  <>
                    <Review label="Access key ID" value={form.accessKeyId} mono />
                    <Review label="Region" value={form.region} />
                  </>
                )}
                <Review
                  label={`${provider.scopeNounPlural} to scan`}
                  value={`${selected.size} selected`}
                />
                <Review label="Secret" value="Stored & masked" />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-emerald-600" />
                The secret is encrypted at rest. Saving this connection is recorded
                in the audit log.
              </p>
            </div>
          )}
        </div>

        {/* footer nav */}
        <div className="mt-8 flex items-center justify-between border-t pt-5">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
          >
            <ArrowLeft className="size-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              <ShieldCheck className="size-4" />
              Create configuration
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  )
}

function SecretInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function Review({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate text-sm text-foreground',
          mono && 'font-mono text-xs',
        )}
      >
        {value || '—'}
      </p>
    </div>
  )
}
