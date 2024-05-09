import { useTheme } from 'styled-components'

import { Confirm } from '../../utils/Confirm'
import {
  GlobalServiceFragment,
  useDeleteGlobalServiceMutation,
} from '../../../generated/graphql'

export function DeleteGlobalServiceModal({
  globalService,
  open,
  onClose,
  refetch,
}: {
  globalService: GlobalServiceFragment
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteGlobalServiceMutation({
    variables: { id: globalService.id },
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete service"
      text={
        <>
          Are you sure you want to delete{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            {globalService.name}
          </span>
          ?
        </>
      }
    />
  )
}
