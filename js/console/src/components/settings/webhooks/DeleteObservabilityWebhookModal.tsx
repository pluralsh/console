import { useTheme } from 'styled-components'

import {
  ObservabilityWebhookFragment,
  useDeleteObservabilityWebhookMutation,
} from 'generated/graphql'

import { Confirm } from 'components/utils/Confirm'

export function DeleteObservabilityWebhookModal({
  observabilityWebhook,
  open,
  onClose,
  refetch,
}: {
  observabilityWebhook: ObservabilityWebhookFragment
  open: boolean
  onClose?: () => void
  refetch?: () => void
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteObservabilityWebhookMutation({
    variables: { id: observabilityWebhook.id },
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
      title="delete observability webhook"
      text={
        <>
          Are you sure you want to delete{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{observabilityWebhook.name}”
          </span>
          ?
        </>
      }
    />
  )
}
