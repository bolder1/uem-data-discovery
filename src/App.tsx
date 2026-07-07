import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataDiscoveryProvider } from '@/store/DataDiscoveryContext'
import { ContentFilteringProvider } from '@/store/ContentFilteringContext'
import { AppShell } from '@/components/layout/AppShell'
import { Placeholder } from '@/pages/Placeholder'
import { Dashboard } from '@/pages/v2/Dashboard'
import { SourcesCatalog } from '@/pages/v2/SourcesCatalog'
import { ProviderDetail } from '@/pages/v2/ProviderDetail'
import { ConfigureWizard } from '@/pages/v2/ConfigureWizard'
import { PoliciesList } from '@/pages/v2/PoliciesList'
import { PolicyDetail } from '@/pages/v2/PolicyDetail'
import { ScanJobs } from '@/pages/v2/ScanJobs'
import { Results } from '@/pages/v2/Results'
import { ClassificationList } from '@/pages/contentFiltering/ClassificationList'

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
          { path: 'policies/:policyId', element: <PolicyDetail /> },
          { path: 'scans', element: <ScanJobs /> },
          { path: 'results', element: <Results /> },
        ],
      },
      {
        path: 'content-filtering',
        children: [
          { index: true, element: <Navigate to="classification" replace /> },
          { path: 'classification', element: <ClassificationList /> },
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
      <ContentFilteringProvider>
        <TooltipProvider delayDuration={200}>
          <RouterProvider router={router} />
        </TooltipProvider>
      </ContentFilteringProvider>
    </DataDiscoveryProvider>
  )
}
