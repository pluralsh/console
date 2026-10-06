import {
  SemanticColorKey,
  SeverityCriticalIcon,
  SeverityLowIcon,
  SeverityMediumIcon,
  SeverityUndefinedIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { AlertSeverity } from 'generated/graphql'
import { ComponentType } from 'react'
import styled, { useTheme } from 'styled-components'

export const ALERT_SEVERITY_ORDER = [
  AlertSeverity.Undefined,
  AlertSeverity.Critical,
  AlertSeverity.High,
  AlertSeverity.Medium,
  AlertSeverity.Low,
]

// Short labels, as used in the workbench alert details views.
export const ALERT_SEVERITY_SHORT_LABELS: Record<AlertSeverity, string> = {
  [AlertSeverity.Undefined]: 'Undefined',
  [AlertSeverity.Critical]: 'Critical',
  [AlertSeverity.High]: 'High',
  [AlertSeverity.Medium]: 'Med',
  [AlertSeverity.Low]: 'Low',
}

const SEVERITY_ICONS: Record<
  AlertSeverity,
  { icon: ComponentType<any>; color?: SemanticColorKey }
> = {
  // the design system has no separate "high" mark: high and critical are both
  // fully filled, critical in the stronger danger color
  [AlertSeverity.Critical]: {
    icon: SeverityCriticalIcon,
    color: 'icon-danger-critical',
  },
  [AlertSeverity.High]: { icon: SeverityCriticalIcon, color: 'icon-danger' },
  [AlertSeverity.Medium]: { icon: SeverityMediumIcon, color: 'icon-warning' },
  [AlertSeverity.Low]: { icon: SeverityLowIcon, color: 'icon-success' },
  [AlertSeverity.Undefined]: { icon: SeverityUndefinedIcon },
}

// Signal-bar severity mark (3 bars critical/high, 2 medium, 1 low, 0 undefined).
export function AlertSeverityIcon({
  severity,
  size = 12,
}: {
  severity: AlertSeverity
  size?: number
}) {
  const theme = useTheme()
  const { icon: Icon, color } = SEVERITY_ICONS[severity]
  const label = `${ALERT_SEVERITY_SHORT_LABELS[severity]} severity`

  return (
    <Tooltip
      placement="top"
      label={label}
    >
      <IconWrapSC
        $size={size}
        aria-label={label}
      >
        <Icon
          size={size}
          color={color ? theme.colors[color] : undefined}
          secondaryColor={theme.colors['border-fill-two']}
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
