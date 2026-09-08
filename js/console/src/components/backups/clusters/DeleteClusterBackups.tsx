import { useState } from 'react'

import { Confirm } from '../../utils/Confirm'
import {
  ClustersObjectStoresFragment,
  useDelinkBackupsMutation,
} from '../../../generated/graphql'
import { DeleteIconButton } from '../../utils/IconButtons'

export function DeleteClusterBackups({
  cluster,
  refetch,
}: {
  cluster: Nullable<ClustersObjectStoresFragment>
  refetch: Nullable<() => void>
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDelinkBackupsMutation({
    variables: { clusterId: cluster?.id ?? '' },
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Delete"
        loading={loading}
        error={error}
        open={confirm}
        submit={() => mutation()}
        title="Delete backups configuration"
        text={`Are you sure you want to delete ${cluster?.name} backups configuration?`}
      />
    </div>
  )
}
