import { useChatbot } from '../../AIContext.tsx'
import { Dispatch, SetStateAction, useMemo } from 'react'
import {
  AgentSessionType,
  useCreateAgentSessionMutation,
} from '../../../../generated/graphql.ts'
import {
  KubernetesIcon,
  ListBoxItem,
  RobotIcon,
  Select,
  TerraformLogoIcon,
  Toast,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { lowerCase } from 'lodash'
import { ChatInputSelectButton } from './ChatInputSelectButton.tsx'

function getIcon(type: AgentSessionType | undefined, size = 16) {
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
  agent,
  setAgent,
  connectionId,
}: {
  agent: AgentSessionType | undefined
  setAgent: Dispatch<SetStateAction<AgentSessionType | undefined>>
  connectionId: string
}) {
  const theme = useTheme()
  const { goToThread } = useChatbot()
  const [
    _createAgentSession,
    { loading: _agentSessionLoading, error: agentSessionError },
  ] = useCreateAgentSessionMutation({
    variables: { attributes: { connectionId, prompt: '', type: agent } }, // TODO: Use real prompt.
    onCompleted: (data) => {
      if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
    },
  })

  const icon = useMemo(() => getIcon(agent, 12), [agent])

  // TODO:
  //  Change the button in the chatbot to indicate that the agent is selected.
  //  When the button is clicked then the _createAgentSession mutation should be called
  //  if _agentSessionLoading is false at that time.

  return (
    <>
      <Select
        selectedKey={agent}
        onSelectionChange={(key) => setAgent(key as AgentSessionType)}
        label="agent"
        width={270}
        dropdownHeaderFixed={
          <div
            css={{
              color: theme.colors['text-xlight'],
              padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
            }}
          >
            Select agent type
          </div>
        }
        triggerButton={
          <ChatInputSelectButton tooltip="Use our coding agent to run background task">
            {icon} {lowerCase(agent)} agent
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
