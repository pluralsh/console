import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGetServiceDataQuery,
} from 'generated/graphql'
import {
  GLOBAL_SERVICE_PARAM_ID,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useParams } from 'react-router-dom'
import { ComponentProps, useMemo } from 'react'

import { columns } from '../../services/Services'
import { useFetchPaginatedData } from '../../utils/useFetchPaginatedData'

import { getBreadcrumbs } from './GlobalService'

const GLOBAL_SERVICES_QUERY_PAGE_SIZE = 100

const GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export function GlobalServiceServices() {
  const navigate = useNavigate()
  const serviceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(serviceId, null), { label: 'services' }],
      [serviceId]
    )
  )

  const {
    data,
    loading,
    refetch,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useGetServiceDataQuery,
      pageSize: GLOBAL_SERVICES_QUERY_PAGE_SIZE,
      keyPath: ['globalService', 'services'],
    },
    { serviceId }
  )

  const services = data?.globalService?.services?.edges

  if (error) return <GqlError error={error} />

  if (!data) return <LoadingIndicator />

  return (
    <FullHeightTableWrap>
      <Table
        virtualizeRows
        data={services || []}
        error={error}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
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
        reactTableOptions={{ meta: { refetch } }}
        reactVirtualOptions={GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS}
        emptyStateProps={{
          message: 'No services found.',
        }}
      />
    </FullHeightTableWrap>
  )
}
