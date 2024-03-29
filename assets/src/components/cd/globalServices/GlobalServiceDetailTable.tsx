import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Card, EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import { type VirtualItem } from '@tanstack/react-virtual'
import { type ServiceDeploymentsRowFragment } from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'

import { useQuery } from '@apollo/client'

import { GLOBAL_SERVICE_DETAIL_QUERY } from 'components/cluster/queries'

import { Body2BoldP, Body2P } from 'components/utils/typography/Text'

import { POLL_INTERVAL } from '../ContinuousDeployment'

import {
  SERVICES_QUERY_PAGE_SIZE,
  SERVICES_REACT_VIRTUAL_OPTIONS,
  columns,
} from '../services/Services'

export function GlobalServiceDetailTable({
  setRefetch,
  serviceId,
}: {
  setRefetch?: (refetch: () => () => void) => void
  serviceId?: string
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

  const queryResult = useQuery(GLOBAL_SERVICE_DETAIL_QUERY, {
    variables: {
      first: SERVICES_QUERY_PAGE_SIZE,
      serviceId,
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

  const globalService = data?.globalService
  const services = globalService?.services?.edges
  const pageInfo = services?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: SERVICES_QUERY_PAGE_SIZE,
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
      <Card
        padding="large"
        css={{
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        <div css={{ flexGrow: 1 }}>
          <Body2BoldP>Distribution</Body2BoldP>
          <Body2P>{globalService.distro || 'All distribution'}</Body2P>
        </div>
        <div css={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Body2BoldP>Tags</Body2BoldP>
          <Body2P>
            {globalService.tags
              ?.map((tag) => `${tag?.name}: ${tag?.value}`)
              .join(', ')}
          </Body2P>
        </div>
      </Card>
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!data ? (
          <LoadingIndicator />
        ) : services.length ? (
          <FullHeightTableWrap>
            <Table
              virtualizeRows
              data={services || []}
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
            <EmptyState message="Looks like you don't have any service deployments yet." />
          </div>
        )}
      </TabPanel>
    </div>
  )
}
