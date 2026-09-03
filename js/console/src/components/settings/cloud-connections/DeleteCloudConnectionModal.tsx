import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'
import {
  CloudConnectionTinyFragment,
  useDeleteCloudConnectionMutation,
} from 'generated/graphql'

export function DeleteCloudConnectionModal({
  open,
  connection,
  onClose,
  refetch,
}: {
  open: boolean
  connection: Nullable<CloudConnectionTinyFragment>
  onClose: () => void
  refetch?: () => void
}) {
  const { popToast } = useSimpleToast()
  const label = connection?.name ?? 'cloud connection'

  const [mutation, { loading, error }] = useDeleteCloudConnectionMutation({
    variables: { id: connection?.id ?? '' },
    onCompleted: () => {
      popToast({
        content: `${label} deleted`,
        severity: 'success',
      })
      refetch?.()
      onClose()
    },
    refetchQueries: ['CloudConnections'],
    awaitRefetchQueries: true,
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete cloud connection"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete cloud connection"
      text={
        <span>
          Are you sure you want to delete cloud connection{' '}
          <StrongSC $color="text-danger">{label}</StrongSC>?
        </span>
      }
    />
  )
}
