import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { SETTINGS_BREADCRUMBS } from '../Settings'
import { CHATBOTS_SETTINGS_REL_PATH } from '../../../routes/settingsRoutesConst'

const getChatbotsSettingsBreadcrumbs = () => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'chatbots', url: CHATBOTS_SETTINGS_REL_PATH },
]

export default function ChatbotsSettings() {
  useSetBreadcrumbs(useMemo(() => getChatbotsSettingsBreadcrumbs(), []))

  return <div>ChatbotsSettings</div>
}
