import { useState } from 'react'

import { HistoryIcon, IconFrame } from '@pluralsh/design-system'

import { Confirm } from '../../utils/Confirm'
import {
  ClusterBackup,
  useCreateClusterRestoreMutation,
} from '../../../generated/graphql'

export function RestoreClusterBackup({
  backup,
}: {
  backup: Nullable<ClusterBackup>
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useCreateClusterRestoreMutation({
    variables: { backupId: backup?.id ?? '' },
    onCompleted: () => setConfirm(false),
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
        text={`Are you sure you want to restore ${backup?.cluster?.name} configuration from ${backup?.name}?`}
      />
    </div>
  )
}
