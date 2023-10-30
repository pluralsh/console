import { useState } from 'react'
import { useTheme } from 'styled-components'

import { Div } from 'honorable'

import { Confirm } from '../../utils/Confirm'
import {
  ClustersRowFragment,
  useDeleteClusterMutation,
} from '../../../generated/graphql'
import { DeleteIconButton } from '../../utils/IconButtons'

export function DeleteCluster({
  cluster,
  refetch,
}: {
  cluster: ClustersRowFragment
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteClusterMutation({
    variables: { id: cluster.id },
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <Div onClick={(e) => e.stopPropagation()}>
      <DeleteIconButton
        onClick={cluster.protect ? undefined : () => setConfirm(true)}
        tooltip
        textValue={
          cluster.protect
            ? 'Cluster is projected from deletion'
            : 'Delete cluster'
        }
        disabled={!!cluster.protect}
      />
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Delete"
        loading={loading}
        error={error}
        open={confirm}
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
    </Div>
  )
}
