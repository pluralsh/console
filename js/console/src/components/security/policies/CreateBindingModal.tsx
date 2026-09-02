import {
  Button,
  CodeEditor,
  Flex,
  FormField,
  Modal,
} from '@pluralsh/design-system'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  PolicyTinyFragment,
  PolicyType,
  useCreatePolicyMutation,
} from 'generated/graphql'
import { useEffect, useState } from 'react'
import { PolicyDescriptionField, PolicyNameField } from './PolicyIdentityFields'

export function CreateBindingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (policy: PolicyTinyFragment) => void
}) {
  const { popToast } = useSimpleToast()
  const projectId = useProjectId() ?? ''
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [policy, setPolicy] = useState('')

  useEffect(() => {
    if (open) return
    setName('')
    setDescription('')
    setPolicy('')
  }, [open])

  const [createPolicy, { loading, error }] = useCreatePolicyMutation({
    onCompleted: (data) => {
      const created = data.createPolicy

      if (!created) return
      popToast({ content: 'Binding policy created', severity: 'success' })
      onCreated(created)
    },
    refetchQueries: ['Policies'],
    awaitRefetchQueries: true,
  })

  const canCreate = !!name.trim() && !!policy.trim()

  const onSubmit = () => {
    if (!canCreate) return
    createPolicy({
      variables: {
        attributes: {
          name: name.trim(),
          description: description.trim() || undefined,
          projectId: projectId || undefined,
          type: PolicyType.Binding,
          policy,
        },
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      header="New Binding"
      size="large"
      asForm
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          onSubmit()
        },
      }}
      actions={
        <Flex
          justify="space-between"
          width="100%"
          gap="xsmall"
        >
          <Button
            floating
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            primary
            type="submit"
            disabled={!canCreate}
            loading={loading}
          >
            Create binding
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="small"
      >
        {error && <GqlError error={error} />}
        <PolicyNameField
          value={name}
          onChange={setName}
        />
        <PolicyDescriptionField
          value={description}
          onChange={setDescription}
        />
        <FormField
          label="Policy"
          required
        >
          <CodeEditor
            value={policy}
            language="rego"
            onChange={(value) => setPolicy(value ?? '')}
            height={186}
            options={{ minimap: { enabled: false }, wordWrap: 'on' }}
          />
        </FormField>
      </Flex>
    </Modal>
  )
}
