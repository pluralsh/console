import {
  SeverityIcon,
  SeverityIconSeverity,
  Tooltip,
} from '@pluralsh/design-system'
import { AlertSeverity } from 'generated/graphql'

export const ALERT_SEVERITY_ORDER = [
  AlertSeverity.Critical,
  AlertSeverity.High,
  AlertSeverity.Medium,
  AlertSeverity.Low,
  AlertSeverity.Undefined,
]

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  [AlertSeverity.Undefined]: 'Undefined',
  [AlertSeverity.Critical]: 'Critical',
  [AlertSeverity.High]: 'High',
  [AlertSeverity.Medium]: 'Medium',
  [AlertSeverity.Low]: 'Low',
}

const SEVERITY_ICON_SEVERITIES: Record<AlertSeverity, SeverityIconSeverity> = {
  [AlertSeverity.Critical]: 'critical',
  [AlertSeverity.High]: 'high',
  [AlertSeverity.Medium]: 'medium',
  [AlertSeverity.Low]: 'low',
  [AlertSeverity.Undefined]: 'undefined',
}

// Signal-bar severity mark (3 bars critical/high, 2 medium, 1 low, 0 undefined).
export function AlertSeverityIcon({
  severity,
  size = 12,
}: {
  severity: AlertSeverity
  size?: number
}) {
  const label = `${ALERT_SEVERITY_LABELS[severity]} severity`

  return (
    <Tooltip
      placement="top"
      label={label}
    >
      <SeverityIcon
        severity={SEVERITY_ICON_SEVERITIES[severity]}
        size={size}
        role="img"
        aria-label={label}
        // never shrinks next to truncated text
        flexShrink={0}
      />
    </Tooltip>
  )
}
