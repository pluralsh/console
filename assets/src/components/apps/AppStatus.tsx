import { appState } from 'components/Application'
import { Chip } from '@pluralsh/design-system'
import { Readiness } from 'utils/status'

export default function AppStatus({ app }) { // TODO: Verify statuses.
  if (!app) return <Chip size="small">Unknown</Chip>

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
