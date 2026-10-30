import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataDiscoveryProvider } from '@/store/DataDiscoveryContext'
import { ContentFilteringProvider } from '@/store/ContentFilteringContext'
import { ApplicationManagementProvider } from '@/store/ApplicationManagementContext'
import { AppShell } from '@/components/layout/AppShell'
import { Placeholder } from '@/pages/Placeholder'
import { ApplicationManagement } from '@/pages/applicationManagement/ApplicationManagement'
import { ApplicationPolicies } from '@/pages/applicationManagement/ApplicationPolicies'
import { Dashboard } from '@/pages/v2/Dashboard'
import { SourcesCatalog } from '@/pages/v2/SourcesCatalog'
import { ProviderDetail } from '@/pages/v2/ProviderDetail'
import { ConfigureWizard } from '@/pages/v2/ConfigureWizard'
import { PoliciesList } from '@/pages/v2/PoliciesList'
import { PolicyDetail } from '@/pages/v2/PolicyDetail'
import { ScanJobs } from '@/pages/v2/ScanJobs'
import { Results } from '@/pages/v2/Results'
import { ClassificationList } from '@/pages/contentFiltering/ClassificationList'
import { RuleDictionaryList } from '@/pages/contentFiltering/RuleDictionaryList'
import { AppLibrary } from '@/pages/apps/AppLibrary'
import { AppSetupPage } from '@/pages/apps/AppSetupPage'
import { CategoriesPage } from '@/pages/apps/CategoriesPage'
import { AppLibraryProvider } from '@/store/AppLibraryContext'

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
          { path: 'rule-dictionary', element: <RuleDictionaryList /> },
        ],
      },
      {
        path: 'application-management',
        children: [
          { index: true, element: <ApplicationManagement /> },
          { path: 'policies', element: <ApplicationPolicies /> },
        ],
      },
      { path: 'mdm/apple/app-library', element: <AppLibrary /> },
      { path: 'mdm/apple/app-library/:appId', element: <AppSetupPage /> },
      { path: 'mdm/categories', element: <CategoriesPage /> },
      { path: 'module/:slug', element: <Placeholder /> },
      { path: '*', element: <Navigate to="/data-discovery" replace /> },
    ],
  },
])

export default function App() {
  return (
    <DataDiscoveryProvider>
      <ContentFilteringProvider>
        <ApplicationManagementProvider>
          <AppLibraryProvider>
            <TooltipProvider delayDuration={200}>
              <RouterProvider router={router} />
            </TooltipProvider>
          </AppLibraryProvider>
        </ApplicationManagementProvider>
      </ContentFilteringProvider>
    </DataDiscoveryProvider>
  )
}
