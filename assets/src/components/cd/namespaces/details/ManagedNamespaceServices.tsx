import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGetManagedNamespaceServicesQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useOutletContext } from 'react-router-dom'
import { ComponentProps, useMemo } from 'react'

import { columns } from 'components/cd/services/Services'

import { useFetchPaginatedData } from '../../utils/useFetchPaginatedData'

import { useSetPageScrollable } from '../../ContinuousDeployment'

import { ManagedNamespaceContextT, getBreadcrumbs } from './ManagedNamespace'

const MANAGED_NAMESPACES_QUERY_PAGE_SIZE = 100

const MANAGED_NAMESPACES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export function ManagedNamespaceServices() {
  const navigate = useNavigate()
  const { namespaceId, namespace } =
    useOutletContext<ManagedNamespaceContextT>()

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(namespaceId, namespace), { label: 'services' }],
      [namespaceId, namespace]
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
      queryHook: useGetManagedNamespaceServicesQuery,
      pageSize: MANAGED_NAMESPACES_QUERY_PAGE_SIZE,
      keyPath: ['managedNamespace', 'services'],
    },
    { namespaceId }
  )

  const services = data?.managedNamespace?.services?.edges

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
        reactVirtualOptions={MANAGED_NAMESPACES_REACT_VIRTUAL_OPTIONS}
        emptyStateProps={{ message: 'No services found.' }}
      />
    </FullHeightTableWrap>
  )
}
