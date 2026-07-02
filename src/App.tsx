import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataDiscoveryProvider } from '@/store/DataDiscoveryContext'
import { AppShell } from '@/components/layout/AppShell'
import { Placeholder } from '@/pages/Placeholder'
import { Dashboard } from '@/pages/v2/Dashboard'
import { SourcesCatalog } from '@/pages/v2/SourcesCatalog'
import { ProviderDetail } from '@/pages/v2/ProviderDetail'
import { ConfigureWizard } from '@/pages/v2/ConfigureWizard'
import { PoliciesList } from '@/pages/v2/PoliciesList'
import { ScanJobs } from '@/pages/v2/ScanJobs'
import { Results } from '@/pages/v2/Results'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/data-discovery" replace /> },
      {
        path: 'data-discovery',
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'sources', element: <SourcesCatalog /> },
          { path: 'sources/:provider', element: <ProviderDetail /> },
          { path: 'sources/:provider/configure', element: <ConfigureWizard /> },
          { path: 'policies', element: <PoliciesList /> },
          { path: 'policies/new', element: <PoliciesList /> },
          { path: 'scans', element: <ScanJobs /> },
          { path: 'results', element: <Results /> },
        ],
      },
      { path: 'module/:slug', element: <Placeholder /> },
      { path: '*', element: <Navigate to="/data-discovery" replace /> },
    ],
  },
])

export default function App() {
  return (
    <DataDiscoveryProvider>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </DataDiscoveryProvider>
  )
}
