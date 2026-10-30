// A page's action bar (Save / Discard), laid out as its own row under the scrolling
// content — the bottom twin of the top bar, not something floating over the page.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const SLOT_ID = 'page-footer-slot'

/** Where page footers land; AppShell renders it right after <main>. */
export function PageFooterSlot() {
  return <div id={SLOT_ID} className="shrink-0 empty:hidden" />
}

/** Render a footer bar into the shell's slot, full width, aligned with the page content. */
export function PageFooter({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById(SLOT_ID)), [])
  if (!slot) return null
  return createPortal(
    <div className="border-t bg-card">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">{children}</div>
    </div>,
    slot,
  )
}
