import { ComponentProps, useCallback, useMemo, useState } from 'react'
import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { VirtualItem } from '@tanstack/react-virtual'

import { useScmConnectionsQuery } from 'generated/graphql'
import { extendConnection } from 'utils/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { GqlError } from 'components/utils/Alert'
import {
  POLL_INTERVAL,
  useSetPageHeaderContent,
} from 'components/cd/ContinuousDeployment'

import { PR_BASE_CRUMBS, PR_SCM_ABS_PATH } from 'routes/prRoutesConsts'

import { columns } from './PrScmConnectionsColumns'
import { CreateScmConnection } from './CreateScmConnection'

export const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const PR_QUERY_PAGE_SIZE = 100

export default function ScmConnections() {
  const theme = useTheme()
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
          label: 'SCM connections',
          url: PR_SCM_ABS_PATH,
        },
      ],
      []
    )
  )

  const queryResult = useScmConnectionsQuery({
    variables: {
      first: PR_QUERY_PAGE_SIZE,
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
  const scmConnections = data?.scmConnections
  const pageInfo = scmConnections?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: PR_QUERY_PAGE_SIZE,
    key: 'scmConnections',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.scmConnections,
          'scmConnections'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  useSetPageHeaderContent(<CreateScmConnection refetch={refetch} />)

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
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
          data={data?.scmConnections?.edges || []}
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
