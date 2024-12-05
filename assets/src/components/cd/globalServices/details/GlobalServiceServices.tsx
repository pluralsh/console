import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'

import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  ServiceDeployment,
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
  globalServiceID: string
}

export function GlobalServiceServices({
  globalServiceID,
}: GlobalServiceServicesProps) {
  const navigate = useNavigate()

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
      keyPath: ['globalService', 'services'],
    },
    { serviceId: globalServiceID }
  )

  const services = useMemo(
    () =>
      data?.globalService?.services?.edges?.map(
        (edge) => edge?.node as ServiceDeployment
      ),
    [data?.globalService?.services?.edges]
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
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        emptyStateProps={{ message: 'No services found.' }}
      />
    </FullHeightTableWrap>
  )
}
