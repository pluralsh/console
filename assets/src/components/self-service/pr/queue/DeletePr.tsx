import { useTheme } from 'styled-components'

import { Confirm } from 'components/utils/Confirm'
import {
  PullRequestFragment,
  useDeletePullRequestMutation,
} from 'generated/graphql'

export function DeletePrModal({
  pr,
  refetch,
  open,
  onClose,
}: {
  pr: PullRequestFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeletePullRequestMutation({
    variables: { id: pr.id },
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
      title="Delete cluster"
      text={
        <>
          Are you sure you want to delete{' '}
          <span css={{ color: theme.colors['text-danger'] }}>{pr.title}</span>?
        </>
      }
    />
  )
}
