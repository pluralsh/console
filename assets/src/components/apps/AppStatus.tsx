import { appState } from 'components/Component'
import { Chip, Tooltip } from '@pluralsh/design-system'

import { Readiness } from 'utils/status'

export default function AppStatus({ app }) {
  if (!app) return <Chip size="small">Unknown</Chip>

  const { readiness, error } = appState(app)

  switch (readiness) {
  case Readiness.Ready:
    return (
      <Chip
        size="small"
        severity="success"
      >
        Ready
      </Chip>
    )
  case Readiness.Failed:
    return (
      <Tooltip label={error.message}>
        <Chip
          size="small"
          severity="error"
        >
          Failed
        </Chip>
      </Tooltip>
    )
  case Readiness.InProgress:
    return (
      <Chip
        size="small"
        severity="warning"
      >
        Pending
      </Chip>
    )
  default:
    return <Chip size="small">Unknown</Chip>
  }
}
