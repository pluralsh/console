import {
  Button,
  EmptyState,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { StackedTextSC } from 'components/utils/table/StackedText'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { useChatProviderConnectionQuery } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CHATBOTS_SETTINGS_ABS_PATH,
  CHATBOTS_SETTINGS_CHATBOT_ID_PARAM_ID,
  getChatbotsSettingsEditAbsPath,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { SETTINGS_BREADCRUMBS } from '../Settings'
import { ChatbotConnectionForm } from './ChatbotConnectionForm'
import {
  SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
  SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
} from './chatbotSetupGuide'

export function ChatbotEditSettings() {
  const navigate = useNavigate()
  const theme = useTheme()
  const params = useParams()
  const chatbotId = params[CHATBOTS_SETTINGS_CHATBOT_ID_PARAM_ID]
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()

  const { data, loading, error } = useChatProviderConnectionQuery({
    variables: { id: chatbotId ?? '' },
    skip: !chatbotId,
    fetchPolicy: 'cache-and-network',
  })
  const chatbot = data?.chatProviderConnection
  const editPath = getChatbotsSettingsEditAbsPath({ chatbotId })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...SETTINGS_BREADCRUMBS,
        { label: 'chatbots', url: CHATBOTS_SETTINGS_ABS_PATH },
        { label: 'edit chatbot', url: editPath },
      ],
      [editPath]
    )
  )
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
              Edit chatbot integration credentials and access policy.
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

  if (error) return <GqlError error={error} />
  if (loading && !chatbot) return <LoadingIndicator />

  return chatbot ? (
    <ChatbotConnectionForm existingConnection={chatbot} />
  ) : (
    <EmptyState message="Chatbot not found.">
      <Button onClick={() => navigate(CHATBOTS_SETTINGS_ABS_PATH)}>
        Back to all chatbots
      </Button>
    </EmptyState>
  )
}
