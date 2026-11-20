import { EmptyState } from '@pluralsh/design-system'

export function DevboxUnavailable({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <EmptyState
      message={title}
      description={message}
    />
  )
}
