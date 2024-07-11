import { removeConnection, updateCache } from 'utils/graphql'

import {
  ProjectFragment,
  ProjectsDocument,
  useDeleteProjectMutation,
} from '../../../generated/graphql'
import { Confirm } from '../../utils/Confirm'

import { PROJECTS_QUERY_PAGE_SIZE } from './ProjectsList'

export function ProjectDeleteModal({
  project,
  open,
  onClose,
}: {
  project: ProjectFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const [mutation, { loading, error }] = useDeleteProjectMutation({
    variables: { id: project.id },
    onCompleted: () => onClose?.(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: ProjectsDocument,
        variables: {
          first: PROJECTS_QUERY_PAGE_SIZE,
        },
        update: (prev) =>
          removeConnection(prev, data?.deleteProject, 'projects'),
      }),
  })

  return (
    <Confirm
      open={open}
      close={() => onClose?.()}
      destructive
      label="Delete project"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete project"
      text={
        <>
          Are you sure you want to delete <b>{project.name}</b>?
        </>
      }
    />
  )
}
