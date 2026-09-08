import { useTheme } from 'styled-components'

import { Confirm } from '../../utils/Confirm'
import {
  GlobalService,
  useDeleteGlobalServiceMutation,
} from '../../../generated/graphql'

export function DeleteGlobalService({
  globalService,
  refetch,
  open,
  onClose,
}: {
  globalService: Pick<GlobalService, 'id' | 'name'>
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteGlobalServiceMutation({
    variables: { id: globalService.id },
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  return (
    <Confirm
      close={onClose}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete global service"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{globalService.name}”
          </span>{' '}
          global service?
        </>
      }
    />
  )
}
