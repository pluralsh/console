import {
  AppsIcon,
  Chip,
  ErrorIcon,
  IconFrame,
  StatusIpIcon,
  SuccessIcon,
} from '@pluralsh/design-system'
import { appState } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import sortBy from 'lodash/sortBy'
import { useContext, useMemo } from 'react'
import { Readiness, ReadinessT } from 'utils/status'

function readinessOrder(readiness: ReadinessT) {
  switch (readiness) {
  case Readiness.Failed:
    return 0
  case Readiness.InProgress:
    return 1
  case Readiness.Ready:
    return 3
  default:
    return 4
  }
}

function StatusIcon({ readiness }: {readiness: ReadinessT}) {
  if (!readiness) return null

  switch (readiness) {
  case Readiness.Failed:
    return (
      <IconFrame
        size="xsmall"
        icon={<ErrorIcon color="icon-danger" />}
      />
    )
  case Readiness.InProgress:
    return (
      <IconFrame
        size="xsmall"
        icon={<StatusIpIcon color="icon-warning" />}
      />
    )
  default:
    return (
      <IconFrame
        size="xsmall"
        icon={<SuccessIcon color="icon-success" />}
      />
    )
  }
}

export default function AppNav() {
  const { applications = [] } = useContext<any>(InstallationContext)

  const statuses = useMemo(() => {
    const unsorted = applications.map(app => ({ app, ...appState(app) }))

    return sortBy(unsorted, [({ readiness }) => readinessOrder(readiness), 'app.name'])
  }, [applications])

  return (
    <Chip
      icon={<AppsIcon />}
      clickable
      size="small"
    >
      Apps
      <StatusIcon readiness={statuses.length > 0 && statuses[0].readiness} />
    </Chip>
  )
}
