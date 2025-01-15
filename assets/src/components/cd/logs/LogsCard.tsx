import { Card, Flyover } from '@pluralsh/design-system'
import LogsScrollIndicator from 'components/cd/logs/LogsScrollIndicator'
import { GqlError } from 'components/utils/Alert'
import {
  LogFacetInput,
  LogLineFragment,
  LogTimeRange,
  useLogAggregationQuery,
} from 'generated/graphql'
import { memo, useState } from 'react'
import { LogContextPanel } from './LogContextPanel'
import { LogsTable } from './LogsTable'
import { secondsToDuration } from './Logs'

const LIMIT = 1000
const POLL_INTERVAL = 10 * 1000

export const LogsCard = memo(function LogsCard({
  serviceId,
  clusterId,
  query,
  limit,
  time,
  labels,
  addLabel,
}: {
  serviceId?: string
  clusterId?: string
  query?: string
  limit?: number
  time?: LogTimeRange
  labels?: LogFacetInput[]
  addLabel?: (key: string, value: string) => void
}) {
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [logLine, setLogLine] = useState<Nullable<LogLineFragment>>(null)
  const [live, setLive] = useState(true)

  const { data, loading, error } = useLogAggregationQuery({
    variables: {
      clusterId,
      query,
      limit: limit || LIMIT,
      serviceId,
      time,
      facets: labels,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: live ? POLL_INTERVAL : 0,
    skip: !(live && (clusterId || serviceId)),
  })

  const initialLoading = !data && loading

  const logs =
    data?.logAggregation?.filter(
      (log): log is LogLineFragment => log !== null
    ) ?? []

  return error ? (
    <GqlError error={error} />
  ) : (
    <Card
      height="100%"
      overflow="hidden"
      header={{
        size: 'large',
        content: (
          <LogsScrollIndicator
            live={live}
            setLive={setLive}
          />
        ),
      }}
    >
      <LogsTable
        loading={initialLoading}
        data={logs}
        onRowClick={(_, row) => {
          setLogLine(row.original)
          setContextPanelOpen(true)
        }}
      />
      {logLine && (
        <Flyover
          open={contextPanelOpen}
          onClose={() => setContextPanelOpen(false)}
          header="Log context"
          width={640}
        >
          <LogContextPanel
            logLine={logLine}
            addLabel={addLabel}
            curDuration={time?.duration ?? secondsToDuration(900)}
            queryVars={{
              clusterId,
              serviceId,
              query,
              facets: labels,
            }}
          />
        </Flyover>
      )}
    </Card>
  )
})
