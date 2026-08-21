import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Info,
  Upload,
  FileUp,
  Link2,
  ImagePlus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Package,
  SquareTerminal,
  HardDrive,
} from 'lucide-react'
import {
  useApplicationManagement,
  type NewApp,
} from '@/store/ApplicationManagementContext'
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
import { formatBytes } from '@/lib/format'
import type { AppPlatform, ManagedApp } from '@/types'
import { PlatformIcon, platformLabel } from './PlatformIcon'
import { PolicySelect } from './PolicySelect'

interface Source {
  mode: 'file' | 'url'
  fileName: string
  fileSize: number
  url: string
}

const emptySource = (): Source => ({ mode: 'file', fileName: '', fileSize: 0, url: '' })
const sourceReady = (s: Source) =>
  s.mode === 'file' ? s.fileSize > 0 || !!s.fileName : s.url.trim().length > 0

const FALLBACK_SIZE: Record<string, number> = {
  MSI: 46_000_000,
  PS1: 24_000,
  PKG: 62_000_000,
  DMG: 88_000_000,
}

const NOISE = /\b(x64|x86|win32|win64|amd64|arm64|universal|setup|installer|install|msi|ps1|pkg|dmg)\b/gi

function sourceFileName(s: Source): string {
  if (s.mode === 'file') return s.fileName
  const clean = s.url.split(/[?#]/)[0]
  const seg = clean.split('/').filter(Boolean).pop() ?? ''
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

function deriveVersion(fileName: string): string {
  const m = fileName.match(/(\d+(?:\.\d+){1,3})/)
  return m ? m[1] : '1.0.0'
}

function deriveName(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/\d+(?:\.\d+){1,3}/g, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!base) return 'Untitled application'
  return base.replace(/\b\w/g, (c) => c.toUpperCase())
}

const WIZARD_STEPS = ['Type', 'Package & setup', 'Policies']

export function UploadAppDrawer({
  platform,
  open,
  onOpenChange,
  onUploaded,
  updateApp,
  skin,
}: {
  platform: AppPlatform
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded?: (app: ManagedApp) => void
  /** When set, the drawer adds a new build to this app instead of creating one. */
  updateApp?: ManagedApp
  /** 'product' re-skins the form to match the live product. */
  skin?: 'product'
}) {
  const product = skin === 'product'
  const { addApp, addVersion, appPolicies } = useApplicationManagement()
  const isUpdate = !!updateApp
  const plat = updateApp?.platform ?? platform
  const isWin = plat === 'windows'

  const [step, setStep] = useState(0)

  // step 1 — installer type
  const [winType, setWinType] = useState<'msi' | 'ps1'>(
    updateApp?.platform === 'windows' && updateApp.packageType === 'PS1'
      ? 'ps1'
      : 'msi',
  )
  const [pkgType, setPkgType] = useState<'PKG' | 'DMG'>(
    updateApp?.packageType === 'DMG' ? 'DMG' : 'PKG',
  )

  // step 2 — setup
  const [icon, setIcon] = useState<string | null>(null)
  const [commandPreset, setCommandPreset] = useState('')
  const [commandCustom, setCommandCustom] = useState('')

  // step 3 — policies
  const [policyIds, setPolicyIds] = useState<string[]>([])

  // package sources
  const [msiMode, setMsiMode] = useState<'separate' | 'same'>('same')
  const [src64, setSrc64] = useState<Source>(emptySource)
  const [src32, setSrc32] = useState<Source>(emptySource)
  const [psSrc, setPsSrc] = useState<Source>(emptySource)
  const [bundleId, setBundleId] = useState(updateApp?.bundleId ?? '')
  const [macSrc, setMacSrc] = useState<Source>(emptySource)

  const isPs1 = isWin && winType === 'ps1'
  const isMsi = isWin && winType === 'msi'
  const primary = isMsi ? src64 : isPs1 ? psSrc : macSrc
  const packageType = isWin ? (isPs1 ? 'PS1' : 'MSI') : isUpdate ? updateApp!.packageType : pkgType
  const architectures = isMsi ? ['64-bit', '32-bit'] : isPs1 ? ['Any'] : ['Universal']
  const packageValid =
    sourceReady(primary) && (isMsi && msiMode === 'separate' ? sourceReady(src32) : true)

  const commandPresets = isPs1
    ? ['-ExecutionPolicy Bypass -File', '-NoProfile -ExecutionPolicy Bypass', '-WindowStyle Hidden']
    : isMsi
      ? ['/quiet /norestart', '/qn REBOOT=ReallySuppress', '/passive /norestart']
      : ['-target /', '-allowUntrusted -target /', '-verbose']
  const presetValue = commandPresets.includes(commandPreset) ? commandPreset : commandPresets[0]
  const command = commandCustom.trim() || presetValue

  const close = () => onOpenChange(false)

  const handleSubmit = () => {
    if (!packageValid) return
    const fileName = sourceFileName(primary)
    const version = deriveVersion(fileName)
    const sizeBytes =
      primary.mode === 'file' && primary.fileSize > 0
        ? primary.fileSize
        : FALLBACK_SIZE[packageType] ?? 50_000_000

    if (isUpdate && updateApp) {
      addVersion(updateApp.id, { version, sizeBytes, architectures })
      onUploaded?.(updateApp)
    } else {
      const input: NewApp = {
        platform: plat,
        name: deriveName(fileName),
        publisher: '',
        iconUrl: icon ?? undefined,
        packageType,
        bundleId: isWin ? undefined : bundleId,
        commandLine: command,
        policyIds,
        version,
        sizeBytes,
        architectures,
      }
      onUploaded?.(addApp(input))
    }
    close()
  }

  const primaryBtn = cn(
    product && 'h-11 rounded-[4px] bg-[#1a56db] px-5 font-semibold hover:bg-[#1e40af]',
  )
  const outlineBtn = cn(
    product && 'h-11 rounded-[4px] border-[#1a56db] px-5 font-semibold text-[#1a56db] hover:bg-blue-50 hover:text-[#1e40af]',
  )

  // ---- the package upload, per installer type ----
  const packageSection = (
    <>
      {isMsi && (
        <>
          {!isUpdate && (
            <FormField label="MSI package">
              <OptionCards
                value={msiMode}
                onChange={setMsiMode}
                options={[
                  { value: 'same', title: 'Same installer', hint: 'One file serves both architectures' },
                  { value: 'separate', title: 'Separate installers', hint: 'Distinct 64-bit and 32-bit files' },
                ]}
              />
            </FormField>
          )}
          <SourcePicker
            label={msiMode === 'same' ? 'Upload MSI file' : 'Upload 64-bit MSI file'}
            accept=".msi"
            fileHint="64-bit '.msi' file"
            source={src64}
            onChange={setSrc64}
          />
          {!isUpdate && msiMode === 'separate' && (
            <SourcePicker
              label="Upload 32-bit MSI file"
              accept=".msi"
              fileHint="32-bit '.msi' file"
              source={src32}
              onChange={setSrc32}
            />
          )}
        </>
      )}

      {isPs1 && (
        <SourcePicker
          label="Upload PowerShell script"
          accept=".ps1"
          fileHint="'.ps1' script"
          source={psSrc}
          onChange={setPsSrc}
        />
      )}

      {!isWin && (
        <>
          <SourcePicker
            label="Upload package file"
            accept=".pkg,.dmg"
            fileHint="'.pkg' or '.dmg' file"
            source={macSrc}
            onChange={setMacSrc}
          />
          {!isUpdate && (
            <FormField
              label="Bundle identifier"
              hint="Optional — used to detect the app already installed on a device."
            >
              <Input
                placeholder="com.company.appname"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="font-mono"
              />
            </FormField>
          )}
        </>
      )}
    </>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-skin={product ? 'product' : undefined}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b px-5 py-4 text-left">
          <PlatformIcon platform={plat} size="sm" />
          <div className="min-w-0">
            <SheetTitle>
              {isUpdate
                ? `Update ${updateApp!.name}`
                : `Upload ${platformLabel(plat)} Application`}
            </SheetTitle>
            <SheetDescription>
              {isUpdate
                ? 'Add a new build to this application.'
                : 'Set up the type, package and policies in a few steps.'}
            </SheetDescription>
          </div>
        </SheetHeader>

        {!isUpdate && (
          <WizardStepHeader
            steps={WIZARD_STEPS}
            current={step}
            product={product}
            onGo={(i) => i < step && setStep(i)}
          />
        )}

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {isUpdate ? (
            <>
              <InfoNote product={product}>
                Upload a newer package — its version is read from the file and it
                becomes the current build.
              </InfoNote>
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-4 py-3">
                <PlatformIcon platform={plat} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {updateApp!.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {updateApp!.publisher} · current {updateApp!.versions[0]?.version}
                  </p>
                </div>
              </div>
              {packageSection}
            </>
          ) : step === 0 ? (
            <>
              <InfoNote product={product}>
                Choose how this application is delivered to your{' '}
                {platformLabel(plat)} devices.
              </InfoNote>
              {isWin ? (
                <FormField label="Installer type">
                  <OptionCards
                    value={winType}
                    onChange={setWinType}
                    list
                    options={[
                      { value: 'msi', title: 'MSI', hint: 'Windows Enterprise installer (.msi)', icon: <Package className="size-5" /> },
                      { value: 'ps1', title: 'PowerShell', hint: 'Run a PowerShell script (.ps1)', icon: <SquareTerminal className="size-5" /> },
                    ]}
                  />
                </FormField>
              ) : (
                <FormField label="Package type">
                  <OptionCards
                    value={pkgType}
                    onChange={setPkgType}
                    list
                    options={[
                      { value: 'PKG', title: 'PKG Installer', hint: 'Silent install flags supported', icon: <Package className="size-5" /> },
                      { value: 'DMG', title: 'DMG Disk Image', hint: 'Mounted and copied to /Applications', icon: <HardDrive className="size-5" /> },
                    ]}
                  />
                </FormField>
              )}
            </>
          ) : step === 1 ? (
            <>
              <InfoNote product={product}>
                The name, publisher and version are read from the package you upload.
              </InfoNote>
              {packageSection}
              <FormField
                label="App icon"
                hint="PNG or SVG. A placeholder is shown in the list if you don't add one."
              >
                <IconUpload icon={icon} platform={plat} onChange={setIcon} />
              </FormField>
              <FormField
                label={isPs1 ? 'Script arguments' : isWin ? 'Command line' : 'Install command'}
                hint="Choose a preset, or type a custom command below — a custom command overrides the preset."
              >
                <Select value={presetValue} onValueChange={setCommandPreset}>
                  <SelectTrigger className="w-full font-mono text-xs">
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {commandPresets.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={commandCustom}
                  onChange={(e) => setCommandCustom(e.target.value)}
                  placeholder="Or type a custom command…"
                  className="mt-2 font-mono text-xs"
                />
              </FormField>
            </>
          ) : (
            <>
              <InfoNote product={product}>
                The policy at the top of the hierarchy is the{' '}
                <span className="font-semibold">active</span> one — it takes
                precedence for every device group it targets. Reorder the hierarchy
                in the{' '}
                <Link
                  to="/application-management/policies"
                  className={cn(
                    'font-semibold underline underline-offset-2',
                    product ? 'text-blue-700' : 'text-brand',
                  )}
                >
                  Policy tab
                </Link>
                .
              </InfoNote>
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  Attach policies
                </p>
                <PolicySelect policies={appPolicies} value={policyIds} onChange={setPolicyIds} />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-row items-center gap-2 border-t px-5 py-4">
          <Button variant="ghost" onClick={close} className={cn(product && 'h-11')}>
            Cancel
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {!isUpdate && step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className={outlineBtn}>
                <ChevronLeft className="size-4" />
                Back
              </Button>
            )}
            {!isUpdate && step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !packageValid}
                className={primaryBtn}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!packageValid} className={primaryBtn}>
                <Upload className="size-4" />
                {isUpdate ? 'Upload new version' : 'Upload App'}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function WizardStepHeader({
  steps,
  current,
  product,
  onGo,
}: {
  steps: string[]
  current: number
  product: boolean
  onGo: (i: number) => void
}) {
  const brand = product ? 'text-[#1a56db]' : 'text-brand'
  return (
    <div className="flex items-center gap-2 border-b bg-secondary/30 px-5 py-3">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onGo(i)}
              disabled={i >= current}
              className={cn('flex items-center gap-2', i < current && 'cursor-pointer')}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done
                    ? product
                      ? 'bg-[#1a56db] text-white'
                      : 'bg-brand text-brand-foreground'
                    : active
                      ? product
                        ? 'border-2 border-[#1a56db] text-[#1a56db]'
                        : 'border-2 border-brand text-brand'
                      : 'border border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-xs font-medium',
                  active ? brand : done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function InfoNote({ product, children }: { product: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
        product ? 'border-blue-200 bg-blue-50' : 'border-brand/20 bg-brand/5',
      )}
    >
      <Info className={cn('mt-0.5 size-4 shrink-0', product ? 'text-blue-600' : 'text-brand')} />
      <p className={product ? 'text-blue-900/80' : 'text-muted-foreground'}>{children}</p>
    </div>
  )
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function OptionCards<T extends string>({
  value,
  onChange,
  options,
  list,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; title: string; hint: string; icon?: ReactNode }[]
  /** Stack the options vertically (a list) instead of a 2-column grid. */
  list?: boolean
}) {
  return (
    <div className={cn('grid gap-2.5', !list && 'sm:grid-cols-2')}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              active ? 'border-brand/40 bg-brand/5' : 'border-border hover:bg-secondary/60',
            )}
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                active ? 'border-brand' : 'border-input',
              )}
            >
              {active && <span className="size-1.5 rounded-full bg-brand" />}
            </span>
            {opt.icon && (
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg border',
                  active
                    ? 'border-brand/30 bg-brand/10 text-brand'
                    : 'border-border bg-secondary/60 text-muted-foreground',
                )}
              >
                {opt.icon}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{opt.title}</span>
              <span className="block text-xs text-muted-foreground">{opt.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SourcePicker({
  label,
  accept,
  fileHint,
  source,
  onChange,
}: {
  label: string
  accept: string
  fileHint: string
  source: Source
  onChange: (s: Source) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Source>) => onChange({ ...source, ...patch })

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    set({ fileName: file.name, fileSize: file.size })
  }

  return (
    <FormField label={label}>
      <div className="grid grid-cols-2 gap-2">
        <SegBtn
          active={source.mode === 'file'}
          onClick={() => set({ mode: 'file' })}
          icon={<FileUp className="size-4" />}
          label="Upload local file"
        />
        <SegBtn
          active={source.mode === 'url'}
          onClick={() => set({ mode: 'url' })}
          icon={<Link2 className="size-4" />}
          label="File URL"
        />
      </div>

      <div className="mt-2.5 rounded-lg border bg-secondary/40 p-3">
        {source.mode === 'file' ? (
          <div className="flex items-center gap-3">
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFile} />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            {source.fileName ? (
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                <Check className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate font-medium text-foreground">{source.fileName}</span>
                {source.fileSize > 0 && (
                  <span className="shrink-0 text-muted-foreground">· {formatBytes(source.fileSize)}</span>
                )}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No file chosen</span>
            )}
          </div>
        ) : (
          <Input
            placeholder={`Paste the ${fileHint} link here`}
            value={source.url}
            onChange={(e) => set({ url: e.target.value })}
            className="bg-card font-mono text-xs"
          />
        )}
      </div>
    </FormField>
  )
}

function SegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-brand/40 bg-brand/5 text-brand'
          : 'border-border text-muted-foreground hover:bg-secondary/60',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function IconUpload({
  icon,
  platform,
  onChange,
}: {
  icon: string | null
  platform: AppPlatform
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onChange(URL.createObjectURL(file))
  }
  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/*"
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors',
          icon
            ? 'border-black/5 bg-white'
            : 'border-dashed border-input text-muted-foreground hover:border-brand hover:text-brand',
        )}
        title={icon ? 'Replace icon' : 'Upload an icon'}
      >
        {icon ? (
          <img src={icon} alt="App icon" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5" />
        )}
      </button>
      <div className="text-xs text-muted-foreground">
        {icon ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
            Remove icon
          </button>
        ) : (
          <>Uses a {platformLabel(platform)} placeholder if left empty.</>
        )}
      </div>
    </div>
  )
}
