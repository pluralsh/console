import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { type VirtualItem } from '@tanstack/react-virtual'
import { type ServiceDeploymentsRowFragment } from 'generated/graphql'
import { getGlobalServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'

import { useQuery } from '@apollo/client'

import { GLOBAL_SERVICES_QUERY } from 'components/cluster/queries'

import { POLL_INTERVAL } from '../ContinuousDeployment'

import {
  GLOBAL_SERVICES_QUERY_PAGE_SIZE,
  GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS,
  columns,
} from './GlobalService'

export function GlobalServicesTable({
  setRefetch,
}: {
  setRefetch?: (refetch: () => () => void) => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)
  const [virtualSlice, setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  const queryResult = useQuery(GLOBAL_SERVICES_QUERY, {
    variables: {
      first: GLOBAL_SERVICES_QUERY_PAGE_SIZE,
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

  console.log('data', data)

  const pageInfo = data?.globalServices?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: GLOBAL_SERVICES_QUERY_PAGE_SIZE,
    key: 'serviceDeployments',
    interval: POLL_INTERVAL,
  })

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        meta: {
          refetch,
        },
      }),
      [refetch]
    )

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.serviceDeployments,
          'serviceDeployments'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
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
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!data ? (
          <LoadingIndicator />
        ) : !isEmpty(data?.globalServices?.edges) ? (
          <FullHeightTableWrap>
            <Table
              virtualizeRows
              data={data?.globalServices?.edges || []}
              columns={columns}
              css={{
                maxHeight: 'unset',
                height: '100%',
              }}
              onRowClick={(
                _e,
                { original }: Row<Edge<ServiceDeploymentsRowFragment>>
              ) =>
                navigate(
                  getGlobalServiceDetailsPath({
                    serviceId: original.node?.id,
                  })
                )
              }
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              reactTableOptions={reactTableOptions}
              reactVirtualOptions={GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS}
              onVirtualSliceChange={setVirtualSlice}
            />
          </FullHeightTableWrap>
        ) : (
          <div css={{ height: '100%' }}>
            <EmptyState message="Looks like you don't have any service deployments yet." />
          </div>
        )}
      </TabPanel>
    </div>
  )
}
