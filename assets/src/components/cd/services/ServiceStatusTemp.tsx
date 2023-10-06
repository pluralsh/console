import { Chip, Tooltip } from '@pluralsh/design-system'

import { Readiness } from 'utils/status'

import { appState } from './misc'

export default function AppStatus({ app }) {
  if (!app) return <Chip size="small">Unknown</Chip>
  const componentsReady = app?.status?.componentsReady

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
            Failed ({componentsReady})
          </Chip>
        </Tooltip>
      )
    case Readiness.InProgress:
      return (
        <Chip
          size="small"
          severity="warning"
        >
          Pending ({componentsReady})
        </Chip>
      )
    default:
      return <Chip size="small">Unknown</Chip>
  }
}
