// The configuration profile route: shows the design version picked in the Design dropdown.
import { useParams } from 'react-router-dom'
import { useConfigDesign, type ConfigDesign } from '@/lib/designVariant'
import { ConfigProfileEditorV1 } from './ConfigProfileEditor'
import { ConfigProfileEditorV2 } from './ConfigProfileEditorV2'
import { ConfigProfileV3, ConfigProfileV4, ConfigProfileV5, ConfigProfileV6, ConfigProfileV7 } from './ConfigProfileVariants'

const PAGES: Record<ConfigDesign, () => React.ReactNode> = {
  v1: ConfigProfileEditorV1, v2: ConfigProfileEditorV2, v3: ConfigProfileV3, v4: ConfigProfileV4,
  v5: ConfigProfileV5, v6: ConfigProfileV6, v7: ConfigProfileV7,
}

export function ConfigProfileRoute() {
  const [design] = useConfigDesign()
  // Keyed by profile so switching profiles starts a fresh draft.
  const { profileId = 'new' } = useParams()
  const Page = PAGES[design]
  return <Page key={profileId} />
}
