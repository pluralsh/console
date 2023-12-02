import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
import { EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row, TableState } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useDebounce } from '@react-hooks-library/core'
import { type VirtualItem } from '@tanstack/react-virtual'
import { useParams } from 'react-router-dom'

import {
  type ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import {
  ColActions,
  ColCluster,
  ColErrors,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
} from '../services/ServicesColumns'

import { ServicesFilters } from '../services/ServicesFilters'
import { DeployService } from '../services/deployModal/DeployService'
import {
  SERVICES_QUERY_PAGE_SIZE,
  SERVICES_REACT_VIRTUAL_OPTIONS,
} from '../services/Services'

const columns = [
  ColServiceDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
  ColActions,
]

export default function ClusterServices() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { clusterId } = useParams()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)
  const tabStateRef = useRef<any>(null)
  const [virtualSlice, setVirtualSlice] = useState<
    | {
        start: VirtualItem
        end: VirtualItem
      }
    | undefined
  >()

  const queryResult = useServiceDeploymentsQuery({
    variables: {
      ...(clusterId ? { clusterId } : {}),
      q: debouncedSearchString,
      first: SERVICES_QUERY_PAGE_SIZE,
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
  const serviceDeployments = data?.serviceDeployments
  const pageInfo = serviceDeployments?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: SERVICES_QUERY_PAGE_SIZE,
    key: 'serviceDeployments',
    interval: POLL_INTERVAL,
  })

  const [tableFilters, setTableFilters] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          ...tableFilters,
        },
        meta: { refetch },
      }),
      [refetch, tableFilters]
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
    return (
      <EmptyState message="Looks like you don't have any service deployments yet." />
    )
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        height: '100%',
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        <ServicesFilters
          setTableFilters={setTableFilters}
          searchString={searchString}
          setSearchString={setSearchString}
          tabStateRef={tabStateRef}
          statusCounts={data.serviceStatuses}
        />
        <DeployService refetch={refetch} />
      </div>
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!isEmpty(data?.serviceDeployments?.edges) ? (
          <FullHeightTableWrap>
            <Table
              data={data?.serviceDeployments?.edges || []}
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
                  getServiceDetailsPath({
                    clusterId: original.node?.cluster?.id,
                    serviceId: original.node?.id,
                  })
                )
              }
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              reactTableOptions={reactTableOptions}
              reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
              onVirtualSliceChange={setVirtualSlice}
            />
          </FullHeightTableWrap>
        ) : (
          <div css={{ height: '100%' }}>
            {searchString || clusterId ? (
              <EmptyState message="No service deployments match your query." />
            ) : (
              <EmptyState message="Looks like you don't have any service deployments yet." />
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
