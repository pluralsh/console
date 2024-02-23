import { useState } from 'react'
import { HistoryIcon, IconFrame } from '@pluralsh/design-system'
import { useNavigate, useParams } from 'react-router-dom'

import { Confirm } from '../../../utils/Confirm'
import {
  ClusterBackup,
  useCreateClusterRestoreMutation,
} from '../../../../generated/graphql'
import {
  CLUSTER_RESTORES_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../../routes/backupRoutesConsts'

export function RestoreClusterBackup({
  backup,
}: {
  backup: Nullable<ClusterBackup>
}) {
  const navigate = useNavigate()
  const { clusterId = '' } = useParams()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useCreateClusterRestoreMutation({
    variables: { backupId: backup?.id ?? '' },
    onCompleted: () => {
      setConfirm(false)
      navigate(
        `${getBackupsClusterAbsPath(clusterId)}/${CLUSTER_RESTORES_REL_PATH}`
      )
    },
  })

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <IconFrame
        clickable
        icon={<HistoryIcon />}
        textValue="Restore backup"
        tooltip
        type="secondary"
        onClick={() => setConfirm(true)}
      />
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Restore"
        loading={loading}
        error={error}
        open={confirm}
        submit={() => mutation()}
        title="Restore cluster configuration"
        text={`Are you sure you want to restore ${backup?.cluster?.name} configuration?`}
      />
    </div>
  )
}
