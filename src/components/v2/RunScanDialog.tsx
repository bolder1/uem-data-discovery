import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STEPS = [
  'Connecting to the data source…',
  'Scanning selected scope…',
  'Classifying content…',
  'Finalizing results…',
]

const STEP_INTERVAL_MS = 650

/**
 * Runs entirely in place — clicking "Run scan now" no longer yanks the user
 * to a different page. This dialog opens over the current screen, narrates
 * progress while the scan runs, then on completion offers a single clear
 * "View results" button — navigating away is always an explicit choice, not
 * folded into what looks like a passive tab. It remembers exactly where the
 * user started (the page `start` was called from) and carries that along as
 * router state, so Results can offer a way back to that exact page instead
 * of defaulting to the dashboard. If the user closes the dialog before the
 * scan finishes, a small toast notifies them the moment it completes
 * instead of silently finishing in the background.
 */
export function useRunScanDialog() {
  const { runScan, scans } = useDataDiscovery()
  const navigate = useNavigate()
  const location = useLocation()
  const [policyName, setPolicyName] = useState('')
  const [scanId, setScanId] = useState<string | null>(null)
  const [origin, setOrigin] = useState<{ path: string; label: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(true)

  const start = (policyId: string, name: string) => {
    const job = runScan(policyId)
    if (!job) return
    setPolicyName(name)
    setScanId(job.id)
    setOrigin({ path: location.pathname + location.search, label: name })
    setOpen(true)
    setAcknowledged(false)
  }

  const scan = scans.find((s) => s.id === scanId)
  const completed = scan?.status === 'completed'

  const resultsPath = scan
    ? `/data-discovery/results?source=${scan.configurationId}&scan=${scan.id}`
    : null

  const goToResults = () => {
    if (!resultsPath) return
    navigate(resultsPath, {
      state: origin ? { from: origin.path, fromLabel: origin.label } : undefined,
    })
  }

  const close = () => setOpen(false)
  const viewResults = () => {
    goToResults()
    setOpen(false)
    setAcknowledged(true)
  }
  const dismissToast = () => setAcknowledged(true)

  const dialog = (
    <>
      {open && (
        <RunScanDialog
          open={open}
          policyName={policyName}
          scan={scan}
          onClose={close}
          onViewResults={viewResults}
        />
      )}
      {!open && completed && !acknowledged && scan && (
        <CompletionToast
          objectsScanned={scan.objectsScanned}
          sensitiveFound={scan.sensitiveFound}
          onView={viewResults}
          onDismiss={dismissToast}
        />
      )}
    </>
  )

  return { start, dialog }
}

function RunScanDialog({
  open,
  policyName,
  scan,
  onClose,
  onViewResults,
}: {
  open: boolean
  policyName: string
  scan: { status: string; objectsScanned: number; sensitiveFound: number } | undefined
  onClose: () => void
  onViewResults: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const completed = scan?.status === 'completed'

  // Cycle through the narration steps while the scan is running. It stops
  // advancing (and just holds on the last step) once the real scan
  // finishes — the completed view takes over regardless of which step
  // the narration had reached.
  useEffect(() => {
    if (!open || completed) return
    setStepIndex(0)
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    }, STEP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [open, completed])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {completed ? (
          <CompletedView scan={scan!} onViewResults={onViewResults} onClose={onClose} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Running scan</DialogTitle>
              <DialogDescription>
                Scanning “{policyName}”. You can keep this open or close it — the
                scan keeps running either way, and we'll let you know when it's done.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {STEPS.map((label, i) => {
                const done = i < stepIndex
                const active = i === stepIndex
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                        done && 'border-emerald-500 bg-emerald-500 text-white',
                        active && 'border-brand text-brand',
                        !done && !active && 'border-border text-transparent',
                      )}
                    >
                      {done ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : active ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        '•'
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        active
                          ? 'font-medium text-foreground'
                          : done
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CompletedView({
  scan,
  onViewResults,
  onClose,
}: {
  scan: { objectsScanned: number; sensitiveFound: number }
  onViewResults: () => void
  onClose: () => void
}) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-5" />
          </span>
          <DialogTitle>Scan completed</DialogTitle>
        </div>
        <DialogDescription>
          {scan.objectsScanned.toLocaleString()} objects scanned ·{' '}
          {scan.sensitiveFound.toLocaleString()} sensitive files found.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Objects scanned</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {scan.objectsScanned.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Sensitive found</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {scan.sensitiveFound.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Stay here
        </Button>
        <Button onClick={onViewResults}>
          View results
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </>
  )
}

// Shown when the scan finishes after the user has already closed the
// dialog — the history/result still gets surfaced, just without forcing
// them back into a modal.
function CompletionToast({
  objectsScanned,
  sensitiveFound,
  onView,
  onDismiss,
}: {
  objectsScanned: number
  sensitiveFound: number
  onView: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 8000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-80 items-start gap-3 rounded-xl border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Scan completed</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {objectsScanned.toLocaleString()} objects scanned ·{' '}
          {sensitiveFound.toLocaleString()} sensitive files found.
        </p>
        <button
          type="button"
          onClick={onView}
          className="mt-2 text-xs font-medium text-brand hover:underline"
        >
          View results
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
