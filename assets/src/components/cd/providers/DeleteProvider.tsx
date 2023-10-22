import { useState } from 'react'

import { Div } from 'honorable'

import { Confirm } from '../../utils/Confirm'
import {
  ClusterProviderFragment,
  useDeleteClusterProviderMutation,
} from '../../../generated/graphql'
import { DeleteIconButton } from '../../utils/IconButtons'

export function DeleteProvider({
  provider,
  refetch,
}: {
  provider: ClusterProviderFragment
  refetch: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteClusterProviderMutation({
    variables: { id: provider.id },
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <Div onClick={(e) => e.stopPropagation()}>
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
        title="Delete cluster provider"
        text={`Are you sure you want to delete ${provider.name}?  You need to make sure all attached clusters are deleted first`}
      />
    </Div>
  )
}
