import { ComponentProps } from 'react'
import { Chip } from '@pluralsh/design-system'

function getChipSeverity(
  severity: string
): ComponentProps<typeof Chip>['severity'] {
  switch (severity) {
    case 'critical':
      return 'danger'
    case 'high':
      return 'warning'
    default:
      return 'info'
  }
}

export default function NotificationSeverity({
  severity,
}: {
  severity: string
}): JSX.Element | null {
  if (!severity) return null

  const lowerCase = severity.toLowerCase()

  return (
    <div>
      <Chip
        hue="lighter"
        severity={getChipSeverity(lowerCase)}
        textTransform="capitalize"
      >
        {lowerCase}
      </Chip>
    </div>
  )
}
