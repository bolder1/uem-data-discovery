import { useState, type ReactNode } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Configuration, Provider, Scope } from '@/types'

// Containers/buckets that are "discovered" the moment a connection is added —
// no scope-selection step, the single form just connects the account.
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

const EMPTY = {
  name: '',
  storageAccount: '',
  tenantId: '',
  clientId: '',
  clientSecret: '',
  endpointSuffix: '',
  accessKeyId: '',
  secretAccessKey: '',
  region: 'us-east-1',
}

export function ConfigureDrawer({
  provider,
  open,
  onOpenChange,
  onAdded,
  editConfig,
}: {
  provider: Provider
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded?: () => void
  /** When set, the drawer edits this connection instead of adding a new one. */
  editConfig?: Configuration
}) {
  const { addConfiguration, updateConfiguration } = useDataDiscovery()
  const isAzure = provider.id === 'azure-blob'
  const isEdit = !!editConfig
  const candidates = isAzure ? AZURE_CANDIDATES : AWS_CANDIDATES

  const [form, setForm] = useState(() =>
    editConfig
      ? {
          ...EMPTY,
          name: editConfig.name,
          storageAccount: editConfig.storageAccount ?? '',
          tenantId: editConfig.tenantId ?? '',
          clientId: editConfig.clientId ?? '',
          endpointSuffix: editConfig.endpointSuffix ?? '',
          accessKeyId: editConfig.accessKeyId ?? '',
          region: editConfig.region ?? 'us-east-1',
        }
      : EMPTY,
  )
  const [showSecret, setShowSecret] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Secrets aren't re-entered when editing (they're write-only / masked), so
  // they're only required when adding a new connection.
  const valid =
    form.name.trim().length > 0 &&
    (isAzure
      ? !!(form.storageAccount && form.tenantId && form.clientId && (isEdit || form.clientSecret))
      : !!(form.accessKeyId && form.region && (isEdit || form.secretAccessKey)))

  const close = (next: boolean) => {
    if (!next) setForm(EMPTY)
    setShowSecret(false)
    onOpenChange(next)
  }

  const handleAdd = () => {
    const scopes: Scope[] = candidates.map((c) => ({
      id: `${provider.id}-${c.id}-${Math.random().toString(36).slice(2, 6)}`,
      name: c.name,
      objects: c.objects,
      sensitive: c.sensitive,
      sizeBytes: c.sizeBytes,
      publicAccess: c.publicAccess,
    }))
    addConfiguration({
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
    onAdded?.()
    close(false)
  }

  const handleSave = () => {
    if (!editConfig) return
    updateConfiguration(editConfig.id, {
      name: form.name.trim(),
      ...(isAzure
        ? {
            storageAccount: form.storageAccount,
            tenantId: form.tenantId,
            clientId: form.clientId,
            endpointSuffix: form.endpointSuffix || 'blob.core.windows.net',
            ...(form.clientSecret
              ? { clientSecretMasked: '••••••••••••••••' }
              : {}),
          }
        : {
            accessKeyId: form.accessKeyId,
            region: form.region,
            ...(form.secretAccessKey
              ? { secretAccessKeyMasked: '••••••••••••••••••••••••' }
              : {}),
          }),
    })
    close(false)
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>
            {isEdit ? 'Edit' : 'Add'} {provider.name} configuration
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? `Update this connection’s properties. Leave secret fields blank to keep the current credentials.`
              : `Connect a ${provider.vendor} account. ${provider.scopeNounPlural} are discovered automatically once it’s added.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <FormField label="Configuration name" required>
            <Input
              placeholder="e.g. Production Storage Account"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </FormField>

          {isAzure ? (
            <>
              <FormField label="Storage account name" required>
                <Input
                  placeholder="e.g. mystorageaccount"
                  value={form.storageAccount}
                  onChange={(e) => set('storageAccount', e.target.value)}
                />
              </FormField>
              <FormField label="Tenant ID" required>
                <Input
                  placeholder="Directory (tenant) ID"
                  value={form.tenantId}
                  onChange={(e) => set('tenantId', e.target.value)}
                />
              </FormField>
              <FormField label="Client ID" required>
                <Input
                  placeholder="Application (client) ID"
                  value={form.clientId}
                  onChange={(e) => set('clientId', e.target.value)}
                />
              </FormField>
              <FormField label="Client secret" required={!isEdit}>
                <SecretInput
                  value={form.clientSecret}
                  onChange={(v) => set('clientSecret', v)}
                  show={showSecret}
                  onToggle={() => setShowSecret((s) => !s)}
                  placeholder={
                    isEdit ? 'Leave blank to keep current' : 'Enter the client secret'
                  }
                />
              </FormField>
              <FormField label="Endpoint suffix">
                <Input
                  placeholder="blob.core.windows.net"
                  value={form.endpointSuffix}
                  onChange={(e) => set('endpointSuffix', e.target.value)}
                />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Access key ID" required>
                <Input
                  placeholder="AKIA…"
                  value={form.accessKeyId}
                  onChange={(e) => set('accessKeyId', e.target.value)}
                />
              </FormField>
              <FormField label="Secret access key" required={!isEdit}>
                <SecretInput
                  value={form.secretAccessKey}
                  onChange={(v) => set('secretAccessKey', v)}
                  show={showSecret}
                  onToggle={() => setShowSecret((s) => !s)}
                  placeholder={
                    isEdit ? 'Leave blank to keep current' : 'Enter the secret access key'
                  }
                />
              </FormField>
              <FormField label="Region" required>
                <Select value={form.region} onValueChange={(v) => set('region', v)}>
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
              </FormField>
            </>
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
                      Register an app under <b>Microsoft Entra ID → App
                      registrations</b> and copy its tenant and client IDs.
                    </li>
                    <li>
                      Create a client secret under <b>Certificates &amp; secrets</b>.
                    </li>
                    <li>
                      Grant the app the <b>Storage Blob Data Reader</b> role on the
                      storage account.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      Create an IAM user with <b>AmazonS3ReadOnlyAccess</b>.
                    </li>
                    <li>Generate an access key pair for that user.</li>
                    <li>Paste the keys and pick the bucket region.</li>
                  </>
                )}
              </ol>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={isEdit ? handleSave : handleAdd} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add configuration'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
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
