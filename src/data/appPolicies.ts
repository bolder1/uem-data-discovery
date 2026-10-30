import type { AppPolicy } from '@/types'

// Device policies that can be assigned to an application ("profile"). Names and
// descriptions mirror the product's Policies list.
export const seedAppPolicies: AppPolicy[] = [
  { id: 'pol-byod', name: 'BYOD', description: 'BYOD device policies with login restriction' },
  { id: 'pol-byod-gsuite', name: 'BYOD-GSuite', description: 'Policy for BYOD GSuite devices' },
  { id: 'pol-byod-o365', name: 'BYOD-Office365', description: 'Policy for BYOD Office365 devices' },
  { id: 'pol-location', name: 'Location', description: 'Policy that set location for devices' },
  { id: 'pol-location-tracking', name: 'LocationTacking', description: 'Policy to Track Location for devices' },
  { id: 'pol-logon-int', name: 'logon-int', description: 'logon-int demo policy' },
  { id: 'pol-multi-kiosk', name: 'MultiAppKiosk', description: 'Policy to configure MultiApp Kiosk' },
  { id: 'pol-single-kiosk', name: 'SingleAppKiosk', description: 'Policy to configure single App kiosk' },
  { id: 'pol-managed-device', name: 'ManagedDevice', description: 'Fully managed corporate device baseline' },
  { id: 'pol-restricted-apps', name: 'RestrictedAppAccess', description: 'Restrict which apps can run on the device' },
  { id: 'pol-webinar', name: 'UEM Webinar - Connex IT', description: 'UEM Webinar - Connex IT' },
]

export const appPolicyById = (id: string): AppPolicy | undefined =>
  seedAppPolicies.find((p) => p.id === id)
