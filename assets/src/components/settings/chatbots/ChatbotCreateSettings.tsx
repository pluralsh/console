import {
  Button,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { StackedTextSC } from 'components/utils/table/StackedText'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { useEffect, useEffectEvent, useMemo } from 'react'
import {
  CHATBOTS_SETTINGS_ABS_PATH,
  CHATBOTS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { SETTINGS_BREADCRUMBS } from '../Settings'
import { ChatbotConnectionForm } from './ChatbotConnectionForm'
import {
  SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
  SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
} from './chatbotSetupGuide'

const CHATBOTS_SETTINGS_CREATE_BREADCRUMBS = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'chatbots', url: CHATBOTS_SETTINGS_ABS_PATH },
  { label: 'create chatbot', url: CHATBOTS_SETTINGS_CREATE_ABS_PATH },
]

export function ChatbotCreateSettings() {
  const theme = useTheme()
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()

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
              onClick={() =>
                openSetupGuidePanel({
                  documentationUrl: SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
                  markdownPath: SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
                })
              }
              css={{ whiteSpace: 'nowrap' }}
            >
              Setup guide
            </Button>
          )}
        </Flex>
      ),
      [isOpen, openSetupGuidePanel, theme]
    )
  )

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  useEffect(() => {
    if (!isOpen) return

    openSetupGuidePanel({
      documentationUrl: SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
      markdownPath: SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
    })
  }, [isOpen, openSetupGuidePanel])

  return <ChatbotConnectionForm />
}
