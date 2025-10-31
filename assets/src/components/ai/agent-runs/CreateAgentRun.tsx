import {
  Button,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { EditableDiv } from 'components/utils/EditableDiv'
import {
  AgentRunAttributes,
  AgentRunMode,
  useCreateAgentRunMutation,
} from 'generated/graphql'
import { FormEvent, useState } from 'react'
import styled from 'styled-components'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'

export function CreateAgentRunButton() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create agent run</Button>
      <CreateAgentRunModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

function CreateAgentRunModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [runtimeId, setRuntimeId] = useState<Nullable<string>>()
  const [form, setForm] = useState<AgentRunAttributes>({
    prompt: '',
    repository: '',
    mode: AgentRunMode.Analyze,
  })
  const [mutation, { loading, error }] = useCreateAgentRunMutation({
    onCompleted: () => onClose(),
    refetchQueries: ['AgentRuns'],
    awaitRefetchQueries: true,
  })

  const allowSubmit = !!runtimeId && !!form.prompt && !!form.repository

  const onSubmit = (e?: FormEvent<HTMLDivElement>) => {
    e?.preventDefault()
    if (allowSubmit)
      mutation({ variables: { runtimeId: runtimeId, attributes: form } })
  }

  return (
    <Modal
      header="Create agent run"
      asForm
      onSubmit={onSubmit}
      open={open}
      onClose={onClose}
      actions={
        <Flex gap="small">
          <Button
            secondary
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!allowSubmit}
            loading={loading}
          >
            Create
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        {error && <GqlError error={error} />}
        <FormField label="Runtime">
          <AIAgentRuntimesSelector
            setSelectedRuntimeId={setRuntimeId}
            placeholder="Select a runtime"
          />
        </FormField>
        <FormField label="Repository URL">
          <Input
            value={form.repository}
            onChange={(e) => setForm({ ...form, repository: e.target.value })}
          />
        </FormField>
        <FormField label="Mode">
          <Select
            selectedKey={form.mode}
            onSelectionChange={(e) =>
              setForm({ ...form, mode: e as AgentRunMode })
            }
          >
            {Object.values(AgentRunMode).map((mode) => (
              <ListBoxItem
                key={mode}
                label={mode}
              />
            ))}
          </Select>
        </FormField>
        <FormField label="Prompt">
          <PromptInputSC
            initialValue={form.prompt}
            setValue={(value) => setForm({ ...form, prompt: value })}
            placeholder="Enter a prompt"
          />
        </FormField>
      </Flex>
    </Modal>
  )
}

const PromptInputSC = styled(EditableDiv)(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors['fill-two'],
  '&:focus': {
    border: theme.borders['outline-focused'],
    backgroundColor: theme.colors['fill-two'],
  },
}))
