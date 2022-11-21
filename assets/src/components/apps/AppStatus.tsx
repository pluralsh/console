import { Readiness, appState } from 'components/Application'
import { Chip } from '@pluralsh/design-system'

export default function AppStatus({ app }) { // TODO: Verify statuses.
  const { readiness } = appState(app)

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
  case Readiness.Complete:
    return (
      <Chip
        size="small"
        severity="success"
      >
        Complete
      </Chip>
    )
  case Readiness.Failed:
    return (
      <Chip
        size="small"
        severity="error"
      >
        Failed
      </Chip>
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
