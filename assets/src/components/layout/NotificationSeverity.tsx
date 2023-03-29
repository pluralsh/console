import { Chip } from '@pluralsh/design-system'

function getChipSeverity(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'error'
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
