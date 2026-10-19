import {
  ArrowTopRightIcon,
  Breadcrumb,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'
import { CHATBOTS_SETTINGS_ABS_PATH } from '../../../routes/settingsRoutesConst'
import { AddChatbotButton, ChatbotsList } from './ChatbotsList'

const CHATBOTS_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'chatbots', url: CHATBOTS_SETTINGS_ABS_PATH },
]

export default function ChatbotsSettings() {
  useSetBreadcrumbs(CHATBOTS_SETTINGS_BREADCRUMBS)

  return (
    <>
      <SettingsDescription>
        Manage all your chatbot integrations and settings here. Use them within
        workbenches to trigger jobs from chat.
      </SettingsDescription>
      <PageToolbarPortal>
        <AddChatbotButton
          buttonProps={{
            secondary: true,
            small: true,
            endIcon: <ArrowTopRightIcon />,
          }}
        />
      </PageToolbarPortal>
      <ChatbotsList />
    </>
  )
}
