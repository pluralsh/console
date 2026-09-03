import { Modal, ValidatedInput } from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { Actions } from 'components/utils/Actions'
import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { Project, useUpdateProjectMutation } from 'generated/graphql'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'

export function ProjectEditModal({
  ...props
}: ComponentProps<typeof ProjectEditModalInner>) {
  return (
    <ModalMountTransition open={props.open}>
      <ProjectEditModalInner {...props} />
    </ModalMountTransition>
  )
}

function ProjectEditModalInner({
  project,
  open,
  onClose,
}: {
  project: Project
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  const {
    state: formState,
    update,
    hasUpdates,
  } = useUpdateState({
    name: project.name,
    description: project.description,
  })
  const { name, description } = formState

  const [mutation, { loading, error }] = useUpdateProjectMutation({
    variables: { id: project.id, attributes: { name, description } },
    onCompleted: onClose,
  })

  return (
    <Modal
      header={<>Edit ‘{project.name}’</>}
      open={open}
      size="large"
      onClose={onClose}
      actions={
        <Actions
          cancel={onClose}
          submit={hasUpdates ? () => mutation() : undefined}
          loading={loading}
          action="Update"
        />
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        {error && (
          <GqlError
            header="Problem editing project attributes"
            error={error}
          />
        )}
        <ValidatedInput
          label="Name"
          value={name}
          onChange={({ target: { value } }) => update({ name: value })}
        />
        <ValidatedInput
          label="Description"
          value={description}
          onChange={({ target: { value } }) => update({ description: value })}
        />
      </div>
    </Modal>
  )
}
