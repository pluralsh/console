import { ListBoxItem, Select } from '@pluralsh/design-system'
import { useJobGateLogsQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'

import { Key, useMemo, useState } from 'react'

import { GqlError } from 'components/utils/Alert'

import { useJobPods } from './PipelineJob'

export default function PipelineJobLogs() {
  const id = useParams().jobId!
  const pods = useJobPods()

  const containers =
    useMemo(
      () =>
        pods?.flatMap(
          (p) =>
            p?.spec?.containers?.flatMap?.((c) => ({
              id: `${p.metadata.name}++${p.metadata.namespace}++${c?.name}`,
              ...c,
            })) ?? []
        ),
      [pods]
    ) || []
  const { data, error } = useJobGateLogsQuery({
    variables: { id, container: containers?.[0]?.name || '', sinceSeconds: 60 },
    pollInterval: 500,
  })
  const [selectedKey, setSelectedKey] = useState<Key>(containers?.[0]?.id || '')
  const logs = data?.pipelineGate?.job?.logs

  if (error) {
    return <GqlError error={error} />
  }

  return (
    <div>
      {containers.length > 1 && (
        <Select
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key)}
        >
          {containers?.map((c) => (
            <ListBoxItem
              key={c.id || ''}
              label={c.name || ''}
              textValue={c.name || ''}
            />
          ))}
        </Select>
      )}
      {logs && <div>{logs}</div>}
    </div>
  )
}
