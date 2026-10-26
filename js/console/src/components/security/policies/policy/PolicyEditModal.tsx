import { Button, Flex, Modal } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { PolicyFragment, useUpdatePolicyMutation } from 'generated/graphql'
import { useState } from 'react'
import {
  PolicyDescriptionField,
  PolicyNameField,
} from '../PolicyIdentityFields'

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
  // only the user's edits are stored; untouched fields show the current policy
  const [edits, setEdits] = useState<{ name?: string; description?: string }>(
    {}
  )
  const name = edits.name ?? policy?.name ?? ''
  const description = edits.description ?? policy?.description ?? ''
  const setName = (name: string) => setEdits((e) => ({ ...e, name }))
  const setDescription = (description: string) =>
    setEdits((e) => ({ ...e, description }))
  const close = () => {
    setEdits({})
    onClose()
  }

  const [updatePolicy, { loading, error }] = useUpdatePolicyMutation({
    onCompleted: () => {
      popToast({ content: 'Policy updated', severity: 'success' })
      close()
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
      onClose={close}
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
            onClick={close}
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
        <PolicyNameField
          value={name}
          onChange={setName}
        />
        <PolicyDescriptionField
          value={description}
          onChange={setDescription}
        />
      </Flex>
    </Modal>
  )
}
