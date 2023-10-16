import { Link } from 'react-router-dom'
import { asQuery } from 'components/utils/query'
import { Button, LogsIcon } from '@pluralsh/design-system'

import { componentsWithLogs } from './ComponentInfo'

function hasLogs(kind: string): boolean {
  return componentsWithLogs.includes(kind)
}

function getLogUrl({ name, namespace, labels }) {
  const appLabel = labels.find(
    ({ name }) => name === 'app' || name === 'app.kubernetes.io/name'
  )

  return `/apps/${namespace}/logs?${asQuery({
    job: `${namespace}/${appLabel ? appLabel.value : name}`,
  })}`
}

export function ViewLogsButton({ metadata, kind }: any) {
  if (!hasLogs(kind) || !metadata) {
    return null
  }

  const url = getLogUrl(metadata)

  return (
    <Button
      secondary
      startIcon={<LogsIcon />}
      as={Link}
      to={url}
    >
      View logs
    </Button>
  )
}
