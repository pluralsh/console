import { Chip, WarningIcon } from '@pluralsh/design-system'
import { Span } from 'honorable'

import { hasAlerts } from '../misc'

export default function RunbookStatus({ runbook, fontWeight = 400 }) {
  if (hasAlerts(runbook)) {
    return (
      <Chip
        icon={<WarningIcon />}
        size="small"
        severity="warning"
      >
        <Span fontWeight={fontWeight}>Alert</Span>
      </Chip>
    )
  }

  return (
    <Chip
      size="small"
      severity="success"
    >
      <Span fontWeight={fontWeight}>Healthy</Span>
    </Chip>
  )
}
