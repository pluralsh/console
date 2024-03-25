import { Input, SearchIcon } from '@pluralsh/design-system'
import LogsLabels from 'components/apps/app/logs/LogsLabels'
import { toMap, useQueryParams } from 'components/utils/query'
import { useCallback, useState } from 'react'

import { LogsCard } from './LogsCard'

export function Logs({
  serviceId,
  clusterId,
}: {
  serviceId?: string | undefined
  clusterId?: string | undefined
}) {
  const query = useQueryParams()
  const [search, setSearch] = useState('')
  const [labels, setLabels] = useState(toMap(query))

  const addLabel = useCallback(
    (name, value) => setLabels({ ...labels, [name]: value }),
    [labels, setLabels]
  )
  const removeLabel = useCallback(
    (name) => {
      const { [name]: _val, ...rest } = labels

      setLabels(rest)
    },
    [labels, setLabels]
  )

  const labelList = Object.entries(labels).map(([name, value]) => ({
    name,
    value,
  }))

  const lokiQuery = search
    ? { labels: labelList, filter: { text: search } }
    : { labels: labelList }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Input
        marginBottom={labelList?.length > 0 ? '' : 'medium'}
        placeholder="Filter logs"
        startIcon={<SearchIcon size={14} />}
        value={search}
        onChange={({ target: { value } }) => setSearch(value)}
        flexShrink={0}
      />
      <LogsLabels
        labels={labelList}
        removeLabel={removeLabel}
      />
      <LogsCard
        serviceId={serviceId}
        clusterId={clusterId}
        query={lokiQuery}
        addLabel={addLabel}
      />
    </div>
  )
}
