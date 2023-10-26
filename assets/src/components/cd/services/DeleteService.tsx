import { useTheme } from 'styled-components'

import { Confirm } from '../../utils/Confirm'
import {
  ServiceDeploymentsRowFragment,
  useDeleteServiceDeploymentMutation,
} from '../../../generated/graphql'

export function DeleteService({
  serviceDeployment,
  refetch,
  open,
  onClose,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  refetch: () => void
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteServiceDeploymentMutation({
    variables: { id: serviceDeployment.id },
    onCompleted: () => {
      onClose()
      refetch?.()
    },
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete service deployment"
      text={
        <>
          Are you sure you want to delete{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{serviceDeployment.name}”{' '}
          </span>
          deployment?
        </>
      }
    />
  )
}
