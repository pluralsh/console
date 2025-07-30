import { useTheme } from 'styled-components'

import { ChatInput } from './input/ChatInput.tsx'

import { Body1BoldP, Body2P } from '../../utils/typography/Text.tsx'
import { useChatbot } from '../AIContext.tsx'
import { Flex, Toast } from '@pluralsh/design-system'
import { useCreateAgentSessionMutation } from '../../../generated/graphql.ts'

export function ChatbotAgentInit() {
  const theme = useTheme()
  const { goToThread, agentInitMode } = useChatbot()

  const [createAgentSession, { error }] = useCreateAgentSessionMutation({
    onCompleted: ({ createAgentSession }) => {
      if (createAgentSession?.id) {
        goToThread(createAgentSession.id)
      }
    },
  })

  return (
    <>
      <Flex
        direction="column"
        gap="medium"
        css={{
          padding: theme.spacing.medium,
          paddingTop: theme.spacing.xxxxxlarge,
        }}
      >
        <Body1BoldP>Copilot Agent</Body1BoldP>
        <Body2P css={{ color: theme.colors['text-xlight'] }}>
          Our agent is a background coding agent that can run background tasks
          by writing terraform, finding code, suggest fixes, and creating PRs...
        </Body2P>
      </Flex>
      <ChatInput
        enableExamplePrompts={false}
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
