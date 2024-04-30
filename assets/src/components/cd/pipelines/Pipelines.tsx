import { useCallback, useState } from 'react'
import {
  Input2,
  LoopingLogo,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { type Row } from '@tanstack/react-table'
import { useTheme } from 'styled-components'
import { type VirtualItem } from '@tanstack/react-virtual'
import { useNavigate } from 'react-router-dom'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import {
  PRS_REACT_VIRTUAL_OPTIONS,
  PR_QUERY_PAGE_SIZE,
} from 'components/pr/queue/PrQueue'

import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { PipelineFragment, usePipelinesQuery } from 'generated/graphql'
import { Edge, extendConnection } from 'utils/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { CD_BASE_CRUMBS, POLL_INTERVAL } from '../ContinuousDeployment'

import { columns } from './PipelinesColumns'

export const QUERY_PAGE_SIZE = 100

export const PIPELINES_CRUMBS = [
  ...CD_BASE_CRUMBS,
  { label: 'pipelines', url: PIPELINES_ABS_PATH },
]

export default function PipelineList() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)
  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  useSetBreadcrumbs(PIPELINES_CRUMBS)
  const queryResult = usePipelinesQuery({
    variables: {
      first: QUERY_PAGE_SIZE,
      q: debouncedSearchString,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })
  const {
    data: currentData,
    previousData,
    loading,
    error,
    fetchMore,
  } = queryResult
  const data = currentData || previousData
  const pipelines = data?.pipelines
  const pageInfo = pipelines?.pageInfo
  const { refetch: _ } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: PR_QUERY_PAGE_SIZE,
    key: 'pipelines',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult.pipelines, 'pipelines'),
    })
  }, [fetchMore, pageInfo?.endCursor])

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
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
          placeholder="Search"
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
          reactVirtualOptions={PRS_REACT_VIRTUAL_OPTIONS}
          data={data?.pipelines?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onRowClick={(_e, { original }: Row<Edge<PipelineFragment>>) => {
            navigate(`${PIPELINES_ABS_PATH}/${original.node?.id}`)
          }}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
