import {
  Button,
  Code,
  DiffColumnIcon,
  Flex,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import {
  useFlowPreviewEnvironmentTemplatesQuery,
  useFlowQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentPropsWithoutRef, useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

export function SpawnPreviewModal({
  open,
  onClose,
  flowId,
}: { flowId: string } & ComponentPropsWithoutRef<typeof Modal>) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const { data } = useFlowQuery({ variables: { id: flowId } })

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="large"
      header={
        <Flex
          align="center"
          gap="small"
          width="100%"
          justify="space-between"
        >
          <span>Spawn a PR preview</span>
          <TemplateSelect
            flowId={flowId ?? ''}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
          />
        </Flex>
      }
    >
      <Flex
        gap="large"
        flexDirection="column"
      >
        <span>
          To spawn a PR preview environment for your PR, add the following
          annotations into the PR body:
        </span>
        <Code>
          {`Plural Flow: ${data?.flow?.name || 'flow-name'}\nPlural Preview: ${selectedTemplate || '{template-name}'}`}
        </Code>
        <Button
          secondary
          onClick={onClose}
        >
          Close
        </Button>
      </Flex>
    </Modal>
  )
}

function TemplateSelect({
  flowId,
  selectedTemplate,
  setSelectedTemplate,
}: {
  flowId: string
  selectedTemplate: string
  setSelectedTemplate: (template: string) => void
}) {
  const { data } = useFlowPreviewEnvironmentTemplatesQuery({
    variables: { id: flowId },
  })
  const templates = mapExistingNodes(data?.flow?.previewEnvironmentTemplates)

  if (isEmpty(templates)) return null

  return (
    <Flex
      align="center"
      gap="small"
    >
      <span>Select a template:</span>
      <SelectWrapperSC>
        <Select
          selectedKey={selectedTemplate}
          onSelectionChange={(key) => setSelectedTemplate(`${key}`)}
          width={200}
        >
          {templates?.map((template) => (
            <ListBoxItem
              key={template.name}
              label={template.name}
              leftContent={<DiffColumnIcon size={16} />}
              css={{ wordBreak: 'break-word' }}
            />
          ))}
        </Select>
      </SelectWrapperSC>
    </Flex>
  )
}

const SelectWrapperSC = styled.div({
  textTransform: 'none',
  maxWidth: 200,
  overflow: 'hidden',
  wordBreak: 'break-word',
})
