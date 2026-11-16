// One dialog for every command that needs something from the admin first:
// a value (name, time zone, lock message), a confirmation, or — for
// destructive ones — typing the word, the way Kandji asks you to type ERASE.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isOffline, type InventoryDevice } from '@/data/deviceInventory'
import type { DeviceAction } from '@/data/deviceActions'

const TIME_ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles']

/** Commands that can run with one click, no dialog. */
export const needsDialog = (a: DeviceAction) => !!(a.input || a.confirm || a.typed)

export function ActionDialog({ a, d, onClose, onRun }: { a: DeviceAction; d: InventoryDevice; onClose: () => void; onRun: (title: string) => void }) {
  const [value, setValue] = useState(a.input === 'name' ? d.name : a.input === 'timezone' ? 'Asia/Kolkata' : '')
  const [typed, setTyped] = useState('')
  const ok = (!a.typed || typed.trim().toUpperCase() === a.typed) && (a.input !== 'name' || value.trim())
  const title = a.input === 'name' ? `Rename to “${value.trim()}”` : a.input === 'timezone' ? `Set time zone to ${value}` : a.label

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{a.confirm?.title ?? a.label}</DialogTitle>
          <DialogDescription>
            {a.confirm?.body ?? a.detail}{' '}
            <span className="font-medium text-foreground">{d.name}</span> · <span className="font-mono text-xs">{d.serial}</span>
          </DialogDescription>
        </DialogHeader>

        {a.input && (
          <div className="space-y-1.5">
            <Label htmlFor="action-value">{a.input === 'name' ? 'New name' : a.input === 'timezone' ? 'Time zone' : 'Message on the lock screen (optional)'}</Label>
            {a.input === 'timezone' ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger id="action-value" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{TIME_ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
              </Select>
            ) : a.input === 'message' ? (
              <Textarea id="action-value" rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="This device belongs to Acme. Call IT on +91 20 1234 5678." />
            ) : (
              <Input id="action-value" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
            )}
          </div>
        )}

        {a.typed && (
          <div className="space-y-1.5">
            <Label htmlFor="action-typed">Type <span className="font-mono font-semibold">{a.typed}</span> to confirm</Label>
            <Input id="action-typed" autoFocus autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
        )}

        {isOffline(d) && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">The device is offline. This is queued and runs if it checks in again.</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={a.danger ? 'destructive' : 'default'} disabled={!ok} onClick={() => onRun(title)}>{a.label}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
