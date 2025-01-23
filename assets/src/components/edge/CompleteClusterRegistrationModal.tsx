import { Button, FormField, Modal, Input } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import { useTheme } from 'styled-components'
import { useUpdateClusterRegistrationMutation } from 'generated/graphql'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from '../utils/Alert.tsx'
import { TagSelection } from '../cd/services/TagSelection.tsx'
import { tagsToNameValue } from '../cd/services/CreateGlobalService.tsx'
function CompleteClusterRegistrationModal({
  id,
  machineId,
  open,
  onClose,
  refetch,
}: {
  id: string
  machineId: string
  open: boolean
  onClose: () => void
  refetch?: () => void
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [tags, setTags] = useState<Record<string, string>>({})

  const [mutation, { loading, error }] = useUpdateClusterRegistrationMutation({
    onCompleted: () => {
      onClose()
      refetch?.()
    },
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
              tags: tagsToNameValue(tags),
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
        {error && <GqlError error={error} />}
        <FormField
          label="Name"
          required
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Handle">
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </FormField>
        <FormField label="Tags">
          <TagSelection
            {...{
              setTags,
              tags,
              theme,
            }}
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
