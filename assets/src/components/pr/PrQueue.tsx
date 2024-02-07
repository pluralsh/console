import { ComponentProps, useCallback, useMemo, useState } from 'react'
import { SearchIcon, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import Input2 from '@pluralsh/design-system/dist/components/Input2'
import { VirtualItem } from '@tanstack/react-virtual'

import { usePullRequestsQuery } from 'generated/graphql'
import { extendConnection } from 'utils/graphql'

import { PR_BASE_CRUMBS, PR_QUEUE_ABS_PATH } from 'routes/prRoutesConsts'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useThrottle } from 'components/hooks/useThrottle'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'

import { GqlError } from 'components/utils/Alert'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { columns } from './PrQueueColumns'

export const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const PR_QUERY_PAGE_SIZE = 100
const PR_STATUS_TAB_KEYS = ['ALL', 'OPEN', 'CLOSED'] as const

type PrStatusTabKey = (typeof PR_STATUS_TAB_KEYS)[number]

export default function OutstandingPrs() {
  const theme = useTheme()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)
  const [_statusFilter, _setStatusFilter] = useState<PrStatusTabKey>('ALL')
  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...PR_BASE_CRUMBS,
        {
          label: 'outstanding PRs',
          url: PR_QUEUE_ABS_PATH,
        },
      ],
      []
    )
  )

  const queryResult = usePullRequestsQuery({
    variables: {
      first: PR_QUERY_PAGE_SIZE,
      q: debouncedSearchString,
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData
  const pullRequests = data?.pullRequests
  const pageInfo = pullRequests?.pageInfo
  const { refetch: _ } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: PR_QUERY_PAGE_SIZE,
    key: 'pullRequests',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult.pullRequests, 'pullRequests'),
    })
  }, [fetchMore, pageInfo?.endCursor])

  if (error) {
    return <GqlError error={error} />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <div css={{ display: 'flex', minWidth: 0, gap: theme.spacing.medium }}>
        <Input2
          startIcon={<SearchIcon />}
          showClearButton
          value={searchString}
          onChange={(e) => setSearchString(e.currentTarget.value)}
          css={{ flexGrow: 1 }}
        />
      </div>
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
          data={data?.pullRequests?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
