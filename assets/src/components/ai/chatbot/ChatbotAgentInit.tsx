import { useTheme } from 'styled-components'

import { ChatInput } from './input/ChatInput.tsx'

import { Body1BoldP, Body2P } from '../../utils/typography/Text.tsx'
import { useChatbot } from '../AIContext.tsx'
import { Chip, Flex, Toast } from '@pluralsh/design-system'
import {
  AgentSessionType,
  useCreateAgentSessionMutation,
} from '../../../generated/graphql.ts'
import { useCallback, useMemo } from 'react'

export function ChatbotAgentInit() {
  const theme = useTheme()
  const { goToThread, agentInitMode: type } = useChatbot()

  const examplePrompts = useMemo(
    () =>
      type === AgentSessionType.Terraform
        ? [
            'Double the size of the Grafana db for me',
            'Use m5.large node types for the demo-dev cluster',
          ]
        : [
            'Double the size of the Elasticsearch cluster for me',
            'Add a "platform.plural.sh/role: metrics" node label selector to the vmstorage resource',
          ],
    [type]
  )

  const [createAgentSession, { error }] = useCreateAgentSessionMutation({
    onCompleted: ({ createAgentSession }) => {
      if (createAgentSession?.id) {
        goToThread(createAgentSession.id)
      }
    },
  })

  const send = useCallback(
    (prompt: string) =>
      createAgentSession({ variables: { attributes: { type, prompt } } }),
    [createAgentSession, type]
  )

  return (
    <>
      <Flex
        direction="column"
        gap="large"
        padding="medium"
        paddingTop={theme.spacing.xxxxxlarge}
      >
        <Flex
          direction="column"
          gap="xxsmall"
        >
          <Body1BoldP>Plural AI Agent</Body1BoldP>
          <Body2P css={{ color: theme.colors['text-xlight'] }}>
            Our agent is a background coding agent that can make clear,
            incremental changes to active Infrastructure as Code already managed
            by Plural. Use it to burn down your backlog of infra configuration
            changes, or offload tasks to a parallelizable AI.
          </Body2P>
        </Flex>
        <Flex
          direction="column"
          gap="small"
        >
          {examplePrompts.map((prompt) => (
            <Chip
              key={prompt}
              onClick={() => send(prompt)}
              clickable
              size="small"
              fillLevel={0}
              css={{ borderRadius: 16 }}
            >
              <b>{prompt}</b>
            </Chip>
          ))}
        </Flex>
      </Flex>
      <ChatInput
        enableExamplePrompts={false}
        placeholder="Start a background task..."
        sendMessage={send}
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
