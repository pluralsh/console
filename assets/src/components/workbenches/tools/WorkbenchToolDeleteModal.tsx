import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'
import {
  useDeleteWorkbenchToolMutation,
  WorkbenchToolFragment,
} from 'generated/graphql'
import { truncate } from 'lodash'

export function WorkbenchToolDeleteModal({
  open,
  tool,
  onClose,
  onDeleted,
}: {
  open: boolean
  tool: Nullable<WorkbenchToolFragment>
  onClose: () => void
  onDeleted?: () => void
}) {
  const { popToast } = useSimpleToast()
  const [mutation, { loading, error }] = useDeleteWorkbenchToolMutation({
    variables: { id: tool?.id ?? '' },
    onCompleted: () => {
      popToast({
        name: tool?.name ?? '',
        action: 'deleted',
        color: 'icon-danger',
      })
      onClose()
      onDeleted?.()
    },
    refetchQueries: ['WorkbenchTools'],
    awaitRefetchQueries: true,
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete tool"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete tool"
      text={
        <span>
          Are you sure you want to delete tool{' '}
          <StrongSC $color="text-danger">
            {truncate(tool?.name ?? '', { length: 40 })}
          </StrongSC>
          ?
        </span>
      }
    />
  )
}
