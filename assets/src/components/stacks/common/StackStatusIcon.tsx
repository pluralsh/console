import { Tooltip } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { StackStatus } from '../../../generated/graphql'
import { LegendColor } from '../../cd/logs/LogsLegend.tsx'
import { statusToSeverity } from './StackStatusChip.tsx'

const severityToColor = {
  neutral: 'border-fill-two',
  info: 'border-info',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  critical: 'border-danger',
}

export default function StackStatusIcon({ status }: { status?: StackStatus }) {
  const theme = useTheme()
  const severity = statusToSeverity[status ?? '']

  return (
    <Tooltip
      label={status}
      placement="left"
    >
      <LegendColor color={theme.colors[severityToColor[severity]]} />
    </Tooltip>
  )
}
