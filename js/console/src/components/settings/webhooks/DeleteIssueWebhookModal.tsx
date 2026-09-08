import { useTheme } from 'styled-components'

import {
  IssueWebhookFragment,
  useDeleteIssueWebhookMutation,
} from 'generated/graphql'

import { Confirm } from 'components/utils/Confirm'

export function DeleteIssueWebhookModal({
  issueWebhook,
  open,
  onClose,
  refetch,
}: {
  issueWebhook: IssueWebhookFragment
  open: boolean
  onClose?: () => void
  refetch?: () => void
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteIssueWebhookMutation({
    variables: { id: issueWebhook.id },
    onCompleted: () => {
      refetch?.()
      onClose?.()
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
      title="delete issue webhook"
      text={
        <>
          Are you sure you want to delete{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{issueWebhook.name}”
          </span>
          ?
        </>
      }
    />
  )
}
