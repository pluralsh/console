import {
  SeverityIcon,
  SeverityIconSeverity,
  Tooltip,
} from '@pluralsh/design-system'
import { AlertSeverity } from 'generated/graphql'
import styled from 'styled-components'

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
      <IconWrapSC
        $size={size}
        role="img"
        aria-label={label}
      >
        <SeverityIcon
          severity={SEVERITY_ICON_SEVERITIES[severity]}
          size={size}
        />
      </IconWrapSC>
    </Tooltip>
  )
}

// fixed size, so the mark never shrinks next to truncated text
const IconWrapSC = styled.span<{ $size: number }>(({ $size }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: $size,
  height: $size,
}))
