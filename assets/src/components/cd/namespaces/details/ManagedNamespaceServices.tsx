import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGetManagedNamespaceServicesQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useOutletContext } from 'react-router-dom'
import { useMemo } from 'react'

import { columns } from 'components/cd/services/Services'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../../utils/table/useFetchPaginatedData'

import { useSetPageScrollable } from '../../ContinuousDeployment'

import { ManagedNamespaceContextT, getBreadcrumbs } from './ManagedNamespace'

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
      keyPath: ['managedNamespace', 'services'],
    },
    { namespaceId }
  )

  const services = data?.managedNamespace?.services?.edges

  if (error) return <GqlError error={error} />

  if (!data) return <LoadingIndicator />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      data={services || []}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      columns={columns}
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
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      emptyStateProps={{ message: 'No services found.' }}
    />
  )
}
