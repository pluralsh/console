import {
  Button,
  FolderIcon,
  Modal,
  ValidatedInput,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ProjectsDocument, useCreateProjectMutation } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentProps, useState } from 'react'
import { useTheme } from 'styled-components'
import { appendConnection, updateCache } from 'utils/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { PROJECTS_QUERY_PAGE_SIZE } from './ProjectsList'

export default function ProjectCreate() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        floating
        startIcon={<FolderIcon />}
        onClick={() => setIsOpen(true)}
      >
        Create project
      </Button>
      <ProjectCreateModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

export function ProjectCreateModal({
  ...props
}: ComponentProps<typeof ProjectCreateModalInner>) {
  return (
    <ModalMountTransition open={props.open}>
      <ProjectCreateModalInner {...props} />
    </ModalMountTransition>
  )
}

function ProjectCreateModalInner({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [mutation, { loading, error }] = useCreateProjectMutation({
    variables: { attributes: { name, description } },
    onCompleted: () => onClose(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: ProjectsDocument,
        variables: { first: PROJECTS_QUERY_PAGE_SIZE },
        update: (prev) =>
          appendConnection(prev, data?.createProject, 'projects'),
      }),
  })

  return (
    <Modal
      header="Create project"
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isEmpty(name)}
            onClick={() => mutation()}
            loading={loading}
            marginLeft="medium"
          >
            Create
          </Button>
        </>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        {error && (
          <GqlError
            header="Something went wrong"
            error={error}
          />
        )}
        <ValidatedInput
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          label="Name*"
        />
        <ValidatedInput
          label="Description"
          value={description}
          onChange={({ target: { value } }) => setDescription(value)}
        />
      </div>
    </Modal>
  )
}
