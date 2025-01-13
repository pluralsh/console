import { Card } from '@pluralsh/design-system'
import LogContent from 'components/apps/app/logs/LogContent'
import LogsScrollIndicator from 'components/cd/logs/LogsScrollIndicator'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { LogTimeRange, useLogAggregationQuery } from 'generated/graphql'
import { Flex } from 'honorable'
import { useCallback, useState } from 'react'

const LIMIT = 1000
const POLL_INTERVAL = 10 * 1000

function doUpdate(prev, result) {
  let key = 'cluster'

  if (prev.service) {
    key = 'service'
  }

  return {
    ...prev,
    [key]: {
      ...prev[key],
      logs: [...prev[key].logs, ...result[key].logs],
    },
  }
}

export function LogsCard({
  serviceId,
  clusterId,
  query,
  limit,
  time,
  addLabel,
}: {
  serviceId?: string
  clusterId?: string
  query?: string
  limit?: number
  time?: LogTimeRange
  addLabel?: (name: string, value: string) => void
}) {
  const [listRef, setListRef] = useState<any>(null)
  const [live, setLive] = useState(true)
  const [loader, setLoader] = useState<any>(null)

  const { data, loading, error, fetchMore, refetch } = useLogAggregationQuery({
    variables: { clusterId, query, limit: limit || LIMIT, serviceId, time },
    fetchPolicy: 'cache-and-network',
    pollInterval: live ? POLL_INTERVAL : 0,
    skip: !clusterId && !serviceId,
  })

  const logs = data?.logAggregation

  return error ? (
    <GqlError error={error} />
  ) : (
    <Card
      overflow="hidden"
      position="relative"
      height="100%"
      borderLeft="none"
      borderTopLeftRadius={0}
      borderBottomLeftRadius={0}
      header={{
        content: <LogsScrollIndicator live={live} />,
      }}
    >
      {data ? <span>test</span> : <LoadingIndicator />}
    </Card>
  )
}
