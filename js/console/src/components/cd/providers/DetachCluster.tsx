import { useTheme } from 'styled-components'

import {
  ClustersRowFragment,
  useDetachClusterMutation,
} from '../../../generated/graphql'
import { Confirm } from '../../utils/Confirm'

export function DetachClusterModal({
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
  const [mutation, { loading, error }] = useDetachClusterMutation({
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
      label="Detach"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Detach cluster"
      text={
        <>
          Are you sure you want to detach the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{cluster.name}”
          </span>{' '}
          cluster? The cluster will be deregistered from our system, but will
          not disturb any kubernetes objects.
        </>
      }
      confirmationEnabled={true}
      confirmationText={cluster.name}
    />
  )
}
