import { useTheme } from 'styled-components'

import { Confirm } from '../../utils/Confirm'
import {
  ClustersRowFragment,
  useDeleteClusterMutation,
} from '../../../generated/graphql'

export function DeleteClusterModal({
  cluster,
  refetch,
  open,
  onClose,
}: {
  cluster: ClustersRowFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteClusterMutation({
    variables: { id: cluster.id },
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete cluster provider"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{cluster.name}”
          </span>{' '}
          cluster?
        </>
      }
    />
  )
}
