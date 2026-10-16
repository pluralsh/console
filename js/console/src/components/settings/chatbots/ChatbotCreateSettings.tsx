import {
  Button,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { ChatProviderConnectionType } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  CHATBOTS_SETTINGS_ABS_PATH,
  CHATBOTS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'
import { ChatbotConnectionForm } from './ChatbotConnectionForm'
import { chatbotSetupGuide } from './chatbotSetupGuide'

const CHATBOTS_SETTINGS_CREATE_BREADCRUMBS = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'chatbots', url: CHATBOTS_SETTINGS_ABS_PATH },
  { label: 'create chatbot', url: CHATBOTS_SETTINGS_CREATE_ABS_PATH },
]

export function ChatbotCreateSettings() {
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const [type, setType] = useState(ChatProviderConnectionType.Slack)
  const setupGuide = useMemo(() => chatbotSetupGuide(type), [type])

  useSetBreadcrumbs(CHATBOTS_SETTINGS_CREATE_BREADCRUMBS)

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  useEffect(() => {
    if (!isOpen) return

    openSetupGuidePanel(setupGuide)
  }, [isOpen, openSetupGuidePanel, setupGuide])

  return (
    <>
      <SettingsDescription>
        Create a chatbot integration that workbenches can use to trigger jobs
        from chat.
      </SettingsDescription>
      {!isOpen && (
        <PageToolbarPortal>
          <Button
            secondary
            small
            startIcon={<SidePanelOpenIcon />}
            onClick={() => openSetupGuidePanel(setupGuide)}
          >
            Setup guide
          </Button>
        </PageToolbarPortal>
      )}
      <ChatbotConnectionForm onTypeChange={setType} />
    </>
  )
}
