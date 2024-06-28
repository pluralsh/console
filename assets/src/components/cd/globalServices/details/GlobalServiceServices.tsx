import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGetGlobalServiceServicesQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useOutletContext } from 'react-router-dom'
import { ComponentProps, useMemo } from 'react'

import { useFetchPaginatedData } from '../../utils/useFetchPaginatedData'

import {
  ColDistribution,
  ColLastActivity,
  ColServiceName,
  ColTags,
} from '../GlobalServicesColumns'

import { useSetPageScrollable } from '../../ContinuousDeployment'

import { GlobalServiceContextT, getBreadcrumbs } from './GlobalService'

export const COLUMNS = [
  ColServiceName,
  ColDistribution,
  ColTags,
  ColLastActivity,
]

const GLOBAL_SERVICES_QUERY_PAGE_SIZE = 100

const GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export function GlobalServiceServices() {
  const navigate = useNavigate()
  const { globalServiceId, globalService } =
    useOutletContext<GlobalServiceContextT>()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(globalServiceId, globalService),
        { label: 'services' },
      ],
      [globalServiceId, globalService]
    )
  )

  useSetPageScrollable(false)

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
      queryHook: useGetGlobalServiceServicesQuery,
      pageSize: GLOBAL_SERVICES_QUERY_PAGE_SIZE,
      keyPath: ['globalService', 'services'],
    },
    { serviceId: globalServiceId }
  )

  const services = data?.globalService?.services?.edges

  if (error) return <GqlError error={error} />

  if (!data) return <LoadingIndicator />

  return (
    <FullHeightTableWrap>
      <Table
        virtualizeRows
        data={services || []}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        columns={COLUMNS}
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
        emptyStateProps={{ message: 'No services found.' }}
      />
    </FullHeightTableWrap>
  )
}
