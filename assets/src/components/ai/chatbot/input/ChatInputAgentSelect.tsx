import { useChatbot } from '../../AIContext.tsx'
import { useCallback, useMemo } from 'react'
import {
  AgentSessionType,
  ChatThreadTinyFragment,
  useCreateAgentSessionMutation,
} from '../../../../generated/graphql.ts'
import {
  CloudIcon,
  KubernetesIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  RobotIcon,
  Select,
  TerraformLogoIcon,
  Toast,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { lowerCase } from 'lodash'
import { ChatInputSelectButton } from './ChatInputSelectButton.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'

function getIcon(type: Nullable<AgentSessionType>, size = 16) {
  switch (type) {
    case AgentSessionType.Terraform:
      return (
        <TerraformLogoIcon
          fullColor
          size={size}
        />
      )
    case AgentSessionType.Kubernetes:
      return (
        <KubernetesIcon
          color={'#326CE5'} // TODO: Fix fullColor prop in KubernetesIcon.
          size={size}
        />
      )
    default:
      return <RobotIcon size={size} />
  }
}

export function ChatInputAgentSelect({
  prompt,
  currentThread,
  connectionId,
}: {
  prompt: string
  currentThread: ChatThreadTinyFragment
  connectionId: string | undefined
}) {
  const theme = useTheme()
  const { createNewThread, goToThread } = useChatbot()
  const agent = currentThread?.session?.type
  const icon = useMemo(() => getIcon(agent, 12), [agent])

  const [createAgentSession, { loading, error: agentSessionError }] =
    useCreateAgentSessionMutation({
      onCompleted: (data) => {
        if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
      },
    })

  const onAgentChange = useCallback(
    (newAgent: Nullable<AgentSessionType>) => {
      // If the selected agent is the same as the current one or if there is an
      // ongoing change, do nothing.
      if (newAgent === agent || loading) {
        return
      }

      // If a new agent is selected, create a new agent session.
      if (newAgent) {
        createAgentSession({
          variables: { attributes: { connectionId, prompt, type: newAgent } },
        })
      }

      // If the agent is deselected, go back to the previous thread.
      if (!newAgent) {
        // TODO: Instead of creating a new thread, we should go back to the previous one.
        createNewThread({ summary: 'New chat with Plural Copilot' })
      }
    },
    [agent, connectionId, createAgentSession, createNewThread, loading, prompt]
  )

  return (
    <>
      <Select
        selectedKey={agent ?? ''}
        onSelectionChange={(key) =>
          onAgentChange(key as Nullable<AgentSessionType>)
        }
        label="agent"
        width={270}
        dropdownHeaderFixed={
          <div
            css={{
              color: theme.colors['text-xlight'],
              padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
            }}
          >
            Select agent
          </div>
        }
        dropdownFooterFixed={
          agent ? (
            <ListBoxFooterPlus
              onClick={() => onAgentChange(undefined)}
              leftContent={<CloudIcon />}
            >
              Deselect agent
            </ListBoxFooterPlus>
          ) : undefined
        }
        triggerButton={
          <ChatInputSelectButton tooltip="Use our coding agent to run background task">
            {icon}
            <span css={{ ...TRUNCATE }}>{agent && lowerCase(agent)} agent</span>
          </ChatInputSelectButton>
        }
      >
        <ListBoxItem
          key={AgentSessionType.Terraform}
          leftContent={getIcon(AgentSessionType.Terraform)}
          label="Terraform agent"
          description="Descriptive sentence here" // TODO
        />
        <ListBoxItem
          key={AgentSessionType.Kubernetes}
          leftContent={getIcon(AgentSessionType.Kubernetes)}
          label="Kubernetes agent"
          description="Descriptive sentence here" // TODO
        />
      </Select>
      <Toast
        show={!!agentSessionError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating agent session:</strong>{' '}
        {agentSessionError?.message}
      </Toast>
    </>
  )
}
