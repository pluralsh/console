import {
  Button,
  Flex,
  FormField,
  Input,
  Input2,
  Modal,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { PolicyFragment, useUpdatePolicyMutation } from 'generated/graphql'
import { useEffect, useState } from 'react'

export function PolicyEditModal({
  open,
  onClose,
  policy,
}: {
  open: boolean
  onClose: () => void
  policy: PolicyFragment | null | undefined
}) {
  const { popToast } = useSimpleToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return

    setName(policy?.name ?? '')
    setDescription(policy?.description ?? '')
  }, [open, policy?.description, policy?.name])

  const [updatePolicy, { loading, error }] = useUpdatePolicyMutation({
    onCompleted: () => {
      popToast({ content: 'Policy updated', severity: 'success' })
      onClose()
    },
  })

  const trimmedName = name.trim()
  const trimmedDescription = description.trim()
  const dirty =
    trimmedName !== (policy?.name ?? '') ||
    trimmedDescription !== (policy?.description ?? '').trim()
  const canSave = !!policy?.id && !!trimmedName && dirty

  const onSubmit = () => {
    if (!canSave) return

    updatePolicy({
      variables: {
        id: policy.id,
        attributes: {
          name: trimmedName,
          description: trimmedDescription,
        },
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      header="Edit policy"
      asForm
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          onSubmit()
        },
      }}
      actions={
        <Flex
          justify="flex-end"
          width="100%"
          gap="small"
        >
          <Button
            secondary
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            primary
            type="submit"
            disabled={!canSave}
            loading={loading}
          >
            Save
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="small"
      >
        {error && <GqlError error={error} />}
        <FormField
          label="Name"
          required
        >
          <Input2
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Description">
          <Input
            minRows={2}
            multiline
            placeholder="Describe what this policy governs"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
      </Flex>
    </Modal>
  )
}
