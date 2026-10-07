import {
  Button,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { StackedTextSC } from 'components/utils/table/StackedText'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { ChatProviderConnectionType } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  CHATBOTS_SETTINGS_ABS_PATH,
  CHATBOTS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { SETTINGS_BREADCRUMBS } from '../Settings'
import { ChatbotConnectionForm } from './ChatbotConnectionForm'
import { chatbotSetupGuide } from './chatbotSetupGuide'

const CHATBOTS_SETTINGS_CREATE_BREADCRUMBS = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'chatbots', url: CHATBOTS_SETTINGS_ABS_PATH },
  { label: 'create chatbot', url: CHATBOTS_SETTINGS_CREATE_ABS_PATH },
]

export function ChatbotCreateSettings() {
  const theme = useTheme()
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const [type, setType] = useState(ChatProviderConnectionType.Slack)
  const setupGuide = useMemo(() => chatbotSetupGuide(type), [type])

  useSetBreadcrumbs(CHATBOTS_SETTINGS_CREATE_BREADCRUMBS)
  useSetPageHeaderContent(
    useMemo(
      () => (
        <Flex justifyContent="space-between">
          <StackedTextSC>
            <span
              css={{
                ...theme.partials.text.body2,
                color: theme.colors['text-light'],
              }}
            >
              Create a chatbot integration that workbenches can use to trigger
              jobs from chat.
            </span>
          </StackedTextSC>
          {!isOpen && (
            <Button
              secondary
              startIcon={<SidePanelOpenIcon />}
              onClick={() => openSetupGuidePanel(setupGuide)}
              css={{ whiteSpace: 'nowrap' }}
            >
              Setup guide
            </Button>
          )}
        </Flex>
      ),
      [isOpen, openSetupGuidePanel, setupGuide, theme]
    )
  )

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  useEffect(() => {
    if (!isOpen) return

    openSetupGuidePanel(setupGuide)
  }, [isOpen, openSetupGuidePanel, setupGuide])

  return <ChatbotConnectionForm onTypeChange={setType} />
}
