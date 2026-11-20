import { useState } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Sidebar, SidebarNav } from './Sidebar'
import { Topbar } from './Topbar'
import { PageFooterSlot } from './PageFooter'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  // A route can ask for the whole window (`handle: { wide: true }` in App.tsx).
  const wide = useMatches().some((m) => (m.handle as { wide?: boolean } | undefined)?.wide)

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* desktop rail */}
      <Sidebar />

      {/* mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] gap-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className={cn('mx-auto flex w-full flex-1 flex-col px-4 py-7 sm:px-6', !wide && 'max-w-7xl')}>
            <Outlet />
          </div>
        </main>
        <PageFooterSlot />
      </div>
    </div>
  )
}
