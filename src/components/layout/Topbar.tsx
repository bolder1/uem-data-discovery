import { Search, Bell, FileText, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { currentUser } = useDataDiscovery()
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur sm:gap-4 sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden min-w-0 shrink-0 md:block">
        <p className="text-sm text-muted-foreground">Welcome,</p>
        <p className="-mt-0.5 text-base font-semibold capitalize text-foreground">
          {currentUser}
        </p>
      </div>

      <div className="relative mx-auto hidden w-full max-w-md lg:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search data sources, policies, findings…"
          title="Global search is available in the full product"
          className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Available in the full product"
        >
          <FileText className="size-4" />
          <span className="hidden lg:inline">Reporting</span>
        </Button>
        <button
          type="button"
          aria-label="Notifications"
          title="Available in the full product"
          className="hidden size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          <Bell className="size-4" />
        </button>
        <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          GB
        </div>
      </div>
    </header>
  )
}
