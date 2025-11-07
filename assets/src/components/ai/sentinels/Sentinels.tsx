import {
  Chip,
  Flex,
  Input,
  SearchIcon,
  SubTab,
  Table,
  TabList,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { capitalize } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable.ts'
import {
  SentinelFragment,
  SentinelRunStatus,
  SentinelStatisticFragment,
  useSentinelsQuery,
  useSentinelStatisticsQuery,
} from '../../../generated/graphql.ts'
import { mapExistingNodes } from '../../../utils/graphql.ts'
import { GqlError } from '../../utils/Alert.tsx'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData.tsx'
import { sentinelsCols } from './SentinelsTableCols.tsx'

type StatusFilterKey = 'All' | SentinelRunStatus

export function Sentinels() {
  const tabStateRef = useRef<any>(null)
  const [filterString, setFilterString] = useState('')
  const [statusFilterKey, setStatusFilterKey] = useState<StatusFilterKey>('All')
  const debouncedFilterString = useDebounce(filterString, 100)

  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useSentinelsQuery, keyPath: ['sentinels'] },
      {
        q: debouncedFilterString || undefined,
        status: statusFilterKey === 'All' ? undefined : statusFilterKey,
      }
    )

  const sentinels = useMemo(() => mapExistingNodes(data?.sentinels), [data])

  const { data: statsData, previousData: statsPreviousData } =
    useSentinelStatisticsQuery({
      variables: { q: debouncedFilterString },
      fetchPolicy: 'cache-and-network',
      pollInterval: POLL_INTERVAL,
    })
  const { sentinelStatistics } = statsData || statsPreviousData || {}
  const statusCounts = useMemo(
    () => getStatusCountMap(sentinelStatistics?.filter(isNonNullable) ?? []),
    [sentinelStatistics]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
    >
      <StackedText
        first="Registered sentinels"
        firstPartialType="body2Bold"
        firstColor="text"
        second="AI-powered sentinel monitoring for your Kubernetes clusters."
        secondPartialType="body2"
        secondColor="text-light"
      />
      <StretchedFlex gap="medium">
        <Input
          style={{ width: '40%' }}
          startIcon={<SearchIcon />}
          placeholder="Search by sentinel name"
          value={filterString}
          onChange={(e) => setFilterString(e.currentTarget.value)}
        />
        <TabList
          scrollable
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: statusFilterKey,
            onSelectionChange: (key) =>
              setStatusFilterKey(key as StatusFilterKey),
          }}
        >
          {Object.entries(statusCounts).map(([label, count]) => (
            <SubTab
              key={label}
              className="statusTab"
              css={{ display: 'flex', gap: 12 }}
            >
              {label === SentinelRunStatus.Pending
                ? 'In progress'
                : capitalize(label)}
              <Chip
                size="small"
                severity={sentinelStatusToSeverity(label as StatusFilterKey)}
              >
                {count}
              </Chip>
            </SubTab>
          ))}
        </TabList>
      </StretchedFlex>
      <Table
        fullHeightWrap
        virtualizeRows
        loading={!data && loading}
        data={sentinels}
        columns={sentinelsCols}
        getRowLink={({ original }) => (
          <Link to={`${(original as SentinelFragment).id}`} />
        )}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No sentinels found.' }}
      />
    </Flex>
  )
}

const getStatusCountMap = (
  stats: SentinelStatisticFragment[]
): Record<StatusFilterKey, number> => {
  const ret = { All: 0, FAILED: 0, SUCCESS: 0, PENDING: 0 }
  stats.forEach((stat) => {
    if (stat) {
      ret[stat.status] = stat.count
      ret.All += stat.count
    }
  })
  return ret
}

function sentinelStatusToSeverity(status: StatusFilterKey) {
  switch (status) {
    case SentinelRunStatus.Failed:
      return 'danger'
    case SentinelRunStatus.Success:
      return 'success'
    case SentinelRunStatus.Pending:
      return 'info'
    default:
      return 'neutral'
  }
}
