import { useState } from 'react'

import { Div } from 'honorable'

import { Confirm } from '../../utils/Confirm'
import {
  ServiceDeploymentsRowFragment,
  useDeleteServiceDeploymentMutation,
} from '../../../generated/graphql'
import { DeleteIconButton } from '../../utils/IconButtons'

export function DeleteService({
  serviceDeployment,
  refetch,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  refetch: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteServiceDeploymentMutation({
    variables: { id: serviceDeployment.id },
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
        title="Delete service deployment"
        text={`Are you sure you want to delete ${serviceDeployment.name} deployment?`}
      />
    </Div>
  )
}
