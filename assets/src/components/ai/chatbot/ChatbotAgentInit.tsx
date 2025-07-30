import { useTheme } from 'styled-components'

import { ChatInput } from './input/ChatInput.tsx'

import { Body1P } from '../../utils/typography/Text.tsx'
import { ChatbotMessagesWrapperSC } from './ChatbotPanelThread.tsx'
import { useChatbot } from '../AIContext.tsx'
import { Toast } from '@pluralsh/design-system'
import { useCreateAgentSessionMutation } from '../../../generated/graphql.ts'

export function ChatbotAgentInit() {
  const theme = useTheme()
  const { currentThread, goToThread, agentInitMode } = useChatbot()

  const [createAgentSession, { loading, error }] =
    useCreateAgentSessionMutation({
      onCompleted: ({ createAgentSession }) => {
        if (createAgentSession?.id) {
          goToThread(createAgentSession.id)
        }
      },
    })

  if (!currentThread) return null

  return (
    <>
      <ChatbotMessagesWrapperSC>
        <Body1P css={{ color: theme.colors['text-long-form'] }}>
          {loading ? 'Generating response...' : 'How can I help you?'}
        </Body1P>
      </ChatbotMessagesWrapperSC>
      <ChatInput
        currentThread={currentThread} // TODO
        sendMessage={(prompt) =>
          createAgentSession({
            variables: {
              attributes: {
                type: agentInitMode,
                prompt,
              },
            },
          })
        }
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
