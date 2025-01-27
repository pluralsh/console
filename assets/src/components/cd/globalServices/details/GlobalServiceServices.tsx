import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'

import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  ServiceDeployment,
  ServiceDeploymentEdge,
  type ServiceDeploymentsRowFragment,
  useGetGlobalServiceServicesQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../../utils/table/useFetchPaginatedData'
import { columns } from './columns'

interface GlobalServiceServicesProps {
  seedService: ServiceDeployment
  globalServiceID: string
}

export function GlobalServiceServices({
  seedService,
  globalServiceID,
}: GlobalServiceServicesProps) {
  const navigate = useNavigate()

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useGetGlobalServiceServicesQuery,
        keyPath: ['globalService', 'services'],
      },
      { serviceId: globalServiceID }
    )

  const services = useMemo(
    () =>
      (seedService
        ? [{ node: seedService } as ServiceDeploymentEdge]
        : []
      ).concat(
        data?.globalService?.services?.edges as Array<ServiceDeploymentEdge>
      ),
    [data?.globalService?.services?.edges, seedService]
  )

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
        reactTableOptions={{ meta: { seedServiceID: seedService?.id } }}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        emptyStateProps={{ message: 'No services found.' }}
      />
    </FullHeightTableWrap>
  )
}
