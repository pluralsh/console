import { useTheme } from 'styled-components'

import { ChatInput } from './input/ChatInput.tsx'

import { Body1P } from '../../utils/typography/Text.tsx'
import { ChatbotMessagesWrapper } from './ChatbotPanelThread.tsx'
import { useChatbot } from '../AIContext.tsx'
import { Toast } from '@pluralsh/design-system'
import { useCreateAgentSessionMutation } from '../../../generated/graphql.ts'

export function ChatbotAgentInit() {
  const theme = useTheme()
  const { currentThread, goToThread, agentInitMode, setAgentInitMode } =
    useChatbot()

  const [createAgentSession, { error }] = useCreateAgentSessionMutation({
    onCompleted: (data) => {
      if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
    },
  })

  // if (!data && loading)
  //   return <LoadingIndicator css={{ background: theme.colors['fill-one'] }} />

  if (!currentThread) return null

  return (
    <>
      <ChatbotMessagesWrapper>
        <Body1P css={{ color: theme.colors['text-long-form'] }}>
          How can I help you?
        </Body1P>
      </ChatbotMessagesWrapper>
      <ChatInput
        currentThread={currentThread} // TODO
        sendMessage={(prompt) => {
          createAgentSession({
            variables: {
              attributes: {
                type: agentInitMode,
                prompt,
              },
            },
          })

          setAgentInitMode(undefined)
        }}
        showMcpServers={false} // TODO
        setShowMcpServers={(_) => {}} // TODO
        showPrompts={false} // TODO
        setShowPrompts={(_) => {}} // TODO
      />
      <Toast
        show={!!error}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating agent session:</strong> {error?.message}
      </Toast>
    </>
  )
}
