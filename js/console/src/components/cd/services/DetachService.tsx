import { useTheme } from 'styled-components'

import { Confirm } from '../../utils/Confirm'
import {
  ServiceDeploymentsRowFragment,
  useDetachServiceDeploymentMutation,
} from '../../../generated/graphql'

export function DetachService({
  serviceDeployment,
  refetch,
  open,
  onClose,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDetachServiceDeploymentMutation({
    variables: { id: serviceDeployment.id },
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Detach"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Detach service deployment"
      text={
        <>
          Are you sure you want to detach the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{serviceDeployment.name}”{' '}
          </span>
          deployment? The service will be removed from the database but all
          resources will remain in Kubernetes.
        </>
      }
    />
  )
}
