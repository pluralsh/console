import { useChatbot } from '../../AIContext.tsx'
import { useState } from 'react'
import {
  AgentSessionType,
  useCreateAgentSessionMutation,
} from '../../../../generated/graphql.ts'
import {
  Button,
  Flex,
  IconFrame,
  Input,
  ListBoxItem,
  Modal,
  RobotIcon,
  Select,
  Toast,
} from '@pluralsh/design-system'

export function ChatInputAgentSelect({
  connectionId,
}: {
  connectionId: string
}) {
  const { goToThread } = useChatbot()
  const [showInputModal, setShowInputModal] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState(AgentSessionType.Terraform)
  const [
    createAgentSession,
    { loading: agentSessionLoading, error: agentSessionError },
  ] = useCreateAgentSessionMutation({
    variables: { attributes: { connectionId, prompt, type } },
    onCompleted: (data) => {
      if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
      setShowInputModal(false)
    },
  })
  return (
    <>
      <IconFrame
        clickable
        icon={<RobotIcon />}
        size="xsmall"
        type="secondary"
        tooltip="Use our coding agent to run background task."
        onClick={() => setShowInputModal(true)}
      />
      <Modal
        header="Set prompt"
        size="large"
        open={showInputModal}
        onClose={() => setShowInputModal(false)}
        asForm
        onSubmit={(e) => {
          e.preventDefault()
          if (!agentSessionLoading) createAgentSession()
        }}
        actions={
          <Button
            type="submit"
            loading={agentSessionLoading}
          >
            Create
          </Button>
        }
      >
        <Flex
          gap="small"
          direction="row"
        >
          <Select
            label="Agent Type"
            selectedKey={type}
            onSelectionChange={(key) => setType(key as AgentSessionType)}
          >
            <ListBoxItem
              key={AgentSessionType.Terraform}
              label="Terraform"
            />
            <ListBoxItem
              key={AgentSessionType.Kubernetes}
              label="Kubernetes"
            />
          </Select>
          <Input
            placeholder="Enter a prompt"
            width="100%"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Flex>
      </Modal>
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
