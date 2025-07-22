import { useChatbot } from '../../AIContext.tsx'
import { useMemo, useState } from 'react'
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
  connectionId,
}: {
  connectionId: string
}) {
  const theme = useTheme()
  const { goToThread } = useChatbot()
  const [type, setType] = useState<AgentSessionType | undefined>()
  const [
    _createAgentSession,
    { loading: _agentSessionLoading, error: agentSessionError },
  ] = useCreateAgentSessionMutation({
    variables: { attributes: { connectionId, prompt: '', type } }, // TODO: Use real prompt.
    onCompleted: (data) => {
      if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
    },
  })

  const icon = useMemo(() => getIcon(type, 12), [type])

  // TODO:
  //  - Change the button in the chatbot to indicate that the agent is selected.
  //    When the button is clicked then the _createAgentSession mutation should be called
  //    if _agentSessionLoading is false at that time.
  //  - Export common part of the code to the new select component so it can be reused.

  return (
    <>
      <Select
        selectedKey={type}
        onSelectionChange={(key) => setType(key as AgentSessionType)}
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
            {icon} {lowerCase(type)} agent
          </ChatInputSelectButton>
        }
      >
        <ListBoxItem
          key={AgentSessionType.Terraform}
          leftContent={getIcon(AgentSessionType.Terraform)}
          label="Terraform agent"
          description="Descriptive sentence here"
        />
        <ListBoxItem
          key={AgentSessionType.Kubernetes}
          leftContent={getIcon(AgentSessionType.Kubernetes)}
          label="Kubernetes agent"
          description="Descriptive sentence here"
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
