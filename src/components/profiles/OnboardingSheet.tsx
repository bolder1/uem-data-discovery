// Onboarding profile editor: a right-side sheet with five tabs, the way the
// live product does it. "Next" walks the tabs; the last tab saves.
import { useState } from 'react'
import { AlertCircle, ArrowRight, Check, X } from 'lucide-react'
import { useSharedIpadDesign, type SharedIpadDesign } from '@/lib/designVariant'
import { SharedIpadTabV2 } from './SharedIpadTabV2'
import { SharedIpadV3, SharedIpadV4, SharedIpadV5, SharedIpadV6, SharedIpadV7 } from './SharedIpadVariants'
import { DesignSelect, sharedIpadDesignLabels } from './DesignSelect'
import type { SharedIpadSettings } from '@/data/profiles'

/** One form per Shared iPad design; all take the same props. */
const SHARED_IPAD_FORMS: Record<SharedIpadDesign, React.ComponentType<{ value: SharedIpadSettings; onChange: (p: Partial<SharedIpadSettings>) => void }>> = {
  v1: SharedIpadTab, v2: SharedIpadTabV2, v3: SharedIpadV3, v4: SharedIpadV4, v5: SharedIpadV5, v6: SharedIpadV6, v7: SharedIpadV7,
}
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirmClose } from '@/components/apps/forms'
import { Switch } from '@/components/ui/switch'
import { SharedIpadTab } from './SharedIpadTab'
import { SetupAssistantTab } from './SetupAssistantTab'
import { Row, Section } from './SettingsRows'
import { useProfiles } from '@/store/ProfilesContext'
import { deviceGroups, osLabel, type OnboardingProfile } from '@/data/profiles'

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'organization', label: 'Organization' },
  { key: 'security', label: 'Security' },
  { key: 'shared', label: 'Shared iPad' },
  { key: 'setup', label: 'Setup Assistant' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function OnboardingSheet({ profile, onClose }: { profile: OnboardingProfile; onClose: () => void }) {
  const { saveOnboarding } = useProfiles()
  const [draft, setDraft] = useState(profile)
  const [tab, setTab] = useState<TabKey>('general')
  const set = (p: Partial<OnboardingProfile>) => setDraft((d) => ({ ...d, ...p }))
  const isNew = !profile.id
  const { requestClose, dialog } = useConfirmClose(JSON.stringify(draft) !== JSON.stringify(profile), onClose)

  const idx = TABS.findIndex((t) => t.key === tab)
  const last = idx === TABS.length - 1
  const problem = !draft.name.trim() ? 'Add a profile name.'
    : !draft.deviceGroup ? 'Pick a device group.'
    : draft.shared.enabled && !draft.shared.owner ? 'Choose a Shared iPad device owner.'
    : null
  // Design version of the Shared iPad tab only (prototype comparison).
  const [sharedDesign, setSharedDesign] = useSharedIpadDesign()

  return (
    <Sheet open onOpenChange={(o) => !o && requestClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">{isNew ? 'Create onboarding profile' : 'Edit onboarding profile'}</SheetTitle>
          <SheetDescription>{isNew ? osLabel[draft.os] : `${draft.name || 'Untitled'} · ${osLabel[draft.os]}`}</SheetDescription>
        </SheetHeader>

        {(
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="min-h-0 flex-1 gap-0">
          <div className="border-b px-6">
            <TabsList variant="line" className="h-11">
              {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <TabsContent value="general" className="space-y-7">
              <Section title="Profile">
                <Row label="Profile name" required stacked blocked={null}>
                  <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Corporate iPhones" aria-invalid={!draft.name.trim() && !isNew} />
                </Row>
                <Row label="Description" stacked>
                  <Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="Who these devices belong to, where they're used" />
                </Row>
              </Section>

              <Section title="Enrollment">
                <Row label="Device group" required hint="Every device that enrolls with this profile joins this group, so group-targeted profiles and apps reach it.">
                  <Select value={draft.deviceGroup} onValueChange={(v) => set({ deviceGroup: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose a group" /></SelectTrigger>
                    <SelectContent>{deviceGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <Row label="Automatically assign new devices" hint="New devices arriving from Apple Business Manager get this profile without anyone assigning them.">
                  <Switch checked={draft.autoAssign} onCheckedChange={(v) => set({ autoAssign: v })} aria-label="Automatically assign new devices" />
                </Row>
                <Row label="Use existing location information" hint="When Apple Business Manager already knows a device's site, keep it instead of asking again.">
                  <Switch checked={draft.useExistingLocation} onCheckedChange={(v) => set({ useExistingLocation: v })} aria-label="Use existing location information" />
                </Row>
              </Section>

              {/* What happens on enrollment, in one sentence, so the choices above read as a result. */}
              <p className="rounded-md border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
                {draft.autoAssign ? 'New devices are assigned automatically' : 'Devices must be assigned by hand'}
                {draft.deviceGroup ? <> and join <span className="font-medium">{draft.deviceGroup}</span></> : ' — pick a device group to say where they land'}.
              </p>
            </TabsContent>

            <TabsContent value="organization" className="space-y-5">
              <p className="text-sm text-muted-foreground">Shown to users during Setup Assistant so they know who to contact.</p>
              <Field label="Support phone number (technical)">
                <Input type="tel" value={draft.supportPhone} onChange={(e) => set({ supportPhone: e.target.value })} placeholder="+1 555 0100" />
              </Field>
              <Field label="Support email address (technical)">
                <Input type="email" value={draft.supportEmail} onChange={(e) => set({ supportEmail: e.target.value })} placeholder="it-help@company.com" />
              </Field>
              <Field label="Department">
                <Input value={draft.department} onChange={(e) => set({ department: e.target.value })} placeholder="IT" />
              </Field>
            </TabsContent>

            <TabsContent value="security" className="space-y-3">
              <Check2 label="Prevent user from enabling Activation Lock" checked={draft.preventActivationLock} onChange={(v) => set({ preventActivationLock: v })} />
              <Check2 label="Allow MDM profile removal" checked={draft.allowMdmRemoval} onChange={(v) => set({ allowMdmRemoval: v })} />
            </TabsContent>

            <TabsContent value="shared" className="space-y-4">
              {/* Prototype control: compare the Shared iPad designs. Delete with the losing ones. */}
              <div className="flex justify-end">
                <DesignSelect value={sharedDesign} onChange={setSharedDesign} labels={sharedIpadDesignLabels} />
              </div>
              {(() => {
                const Form = SHARED_IPAD_FORMS[sharedDesign]
                return <Form value={draft.shared} onChange={(p) => set({ shared: { ...draft.shared, ...p } })} />
              })()}
            </TabsContent>

            <TabsContent value="setup">
              <SetupAssistantTab draft={draft} set={set} />
            </TabsContent>
          </div>
        </Tabs>
        )}

        <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-3">
          {last && problem && (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-amber-700"><AlertCircle className="size-4" />{problem}</span>
          )}
          <Button variant="outline" onClick={requestClose}><X className="size-4" />Cancel</Button>
          {last ? (
            <Button disabled={!!problem} onClick={() => { saveOnboarding(draft); onClose() }}>
              <Check className="size-4" />{isNew ? 'Create' : 'Save'}
            </Button>
          ) : (
            <Button onClick={() => setTab(TABS[idx + 1].key)}>Next<ArrowRight className="size-4" /></Button>
          )}
        </SheetFooter>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive">*</span>}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Check2({ label, checked, onChange, badge }: { label: string; checked: boolean; onChange: (v: boolean) => void; badge?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>{label}</span>
      {badge && <span className="rounded border px-1.5 text-[11px] text-muted-foreground">{badge}</span>}
    </label>
  )
}
