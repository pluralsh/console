import {
  Button,
  EmptyState,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { useChatProviderConnectionQuery } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CHATBOTS_SETTINGS_ABS_PATH,
  CHATBOTS_SETTINGS_CHATBOT_ID_PARAM_ID,
  getChatbotsSettingsEditAbsPath,
} from 'routes/settingsRoutesConst'
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'
import { ChatbotConnectionForm } from './ChatbotConnectionForm'
import { chatbotSetupGuide } from './chatbotSetupGuide'

export function ChatbotEditSettings() {
  const navigate = useNavigate()
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
  const setupGuide = useMemo(
    () => chatbotSetupGuide(chatbot?.type),
    [chatbot?.type]
  )

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
        Edit chatbot integration credentials and access policy.
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
      {error ? (
        <GqlError error={error} />
      ) : loading && !chatbot ? (
        <LoadingIndicator />
      ) : chatbot ? (
        <ChatbotConnectionForm existingConnection={chatbot} />
      ) : (
        <EmptyState message="Chatbot not found.">
          <Button onClick={() => navigate(CHATBOTS_SETTINGS_ABS_PATH)}>
            Back to all chatbots
          </Button>
        </EmptyState>
      )}
    </>
  )
}
