import { Card, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import LogsScrollIndicator from 'components/cd/logs/LogsScrollIndicator'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  LogLineFragment,
  LogTimeRange,
  useLogAggregationQuery,
} from 'generated/graphql'
import { useState } from 'react'
import LogLine from './LogLine'

const LIMIT = 1000
const POLL_INTERVAL = 10 * 1000

const columnHelper = createColumnHelper<LogLineFragment>()

export function LogsCard({
  serviceId,
  clusterId,
  query,
  limit,
  time,
  addLabel: _addLabel,
}: {
  serviceId?: string
  clusterId?: string
  query?: string
  limit?: number
  time?: LogTimeRange
  addLabel?: (name: string, value: string) => void
}) {
  const [live, setLive] = useState(true)

  const { data, loading, error } = useLogAggregationQuery({
    variables: { clusterId, query, limit: limit || LIMIT, serviceId, time },
    fetchPolicy: 'cache-and-network',
    pollInterval: live ? POLL_INTERVAL : 0,
    skip: !clusterId && !serviceId,
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
      <FullHeightTableWrap
        css={
          initialLoading || {
            '& td': { minHeight: 0 },
            '& > div': { height: '100%' },
          }
        }
      >
        <Table
          flush
          hideHeader
          loadingSkeletonRows={12}
          virtualizeRows
          rowBg="raised"
          data={logs}
          columns={cols}
          loading={initialLoading}
          padCells={false}
        />
      </FullHeightTableWrap>
    </Card>
  )
}

const cols = [
  columnHelper.accessor((line) => line, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const line = getValue()
      return <LogLine line={line} />
    },
  }),
]
