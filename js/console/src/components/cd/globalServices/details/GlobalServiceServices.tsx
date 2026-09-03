import { Table } from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import {
  type ServiceDeploymentsRowFragment,
  useGetGlobalServiceServicesQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, mapExistingNodes } from 'utils/graphql'

import { Link } from 'react-router-dom'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'
import { columns } from './columns'

export function GlobalServiceServices({
  seedService,
  globalServiceID,
}: {
  seedService: Nullable<ServiceDeploymentsRowFragment>
  globalServiceID: string
}) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useGetGlobalServiceServicesQuery,
        keyPath: ['globalService', 'services'],
      },
      { serviceId: globalServiceID }
    )
  const serviceEdges: Edge<ServiceDeploymentsRowFragment>[] = useMemo(
    () =>
      (seedService ? [{ node: seedService }] : []).concat(
        mapExistingNodes(data?.globalService?.services).map((service) => ({
          node: service,
        }))
      ),
    [data?.globalService?.services, seedService]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      data={serviceEdges}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      columns={columns}
      getRowLink={({ original }) => {
        const { node } = original as Edge<ServiceDeploymentsRowFragment>
        return (
          <Link
            to={getServiceDetailsPath({
              clusterId: node?.cluster?.id,
              serviceId: node?.id,
            })}
          />
        )
      }}
      reactTableOptions={{ meta: { seedServiceID: seedService?.id } }}
      emptyStateProps={{ message: 'No services found.' }}
    />
  )
}
