import { Button, FormField, Modal, Input2 } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import { useTheme } from 'styled-components'

import { useUpdateClusterRegistrationMutation } from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from '../utils/Alert.tsx'

function CompleteClusterRegistrationModal({
  id,
  machineId,
  open,
  onClose,
}: {
  id: string
  machineId: string
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')

  const [mutation, { loading, error }] = useUpdateClusterRegistrationMutation({
    onCompleted: onClose,
  })

  return (
    <Modal
      onOpenAutoFocus={(e) => e.preventDefault()}
      asForm
      onSubmit={(e) => {
        e.preventDefault()
        mutation({
          variables: {
            id: id,
            attributes: {
              name,
              handle,
            },
          },
        })
      }}
      size="large"
      open={open}
      onClose={onClose}
      header={`Complete cluster registration`}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          <Button
            loading={loading}
            primary
            disabled={!name}
            type="submit"
          >
            Complete
          </Button>
          <Button
            secondary
            type="button"
            onClick={() => onClose?.()}
          >
            Close
          </Button>
        </div>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <p>
          Provide cluster details to complete registration on machine with{' '}
          {machineId} ID.
        </p>
        <GqlError error={error} />
        <FormField
          label="Name"
          required
        >
          <Input2
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Handle">
          <Input2
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  )
}

export function CreateCompleteClusterRegistrationModal(
  props: ComponentProps<typeof CompleteClusterRegistrationModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <CompleteClusterRegistrationModal {...props} />
    </ModalMountTransition>
  )
}
