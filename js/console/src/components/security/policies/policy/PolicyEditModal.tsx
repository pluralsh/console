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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // load the policy into the form whenever the modal opens or the policy changes
  const policyName = policy?.name
  const policyDescription = policy?.description
  const [prevSync, setPrevSync] = useState<{
    open?: boolean
    name?: Nullable<string>
    description?: Nullable<string>
  }>({})
  if (
    prevSync.open !== open ||
    prevSync.name !== policyName ||
    prevSync.description !== policyDescription
  ) {
    setPrevSync({ open, name: policyName, description: policyDescription })
    if (open) {
      setName(policyName ?? '')
      setDescription(policyDescription ?? '')
    }
  }

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
