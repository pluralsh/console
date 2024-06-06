import { Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  GetServiceDataQuery,
  type ServiceDeploymentsRowFragment,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { ApolloError } from '@apollo/client'

import { SERVICES_REACT_VIRTUAL_OPTIONS, columns } from '../services/Services'

export function GlobalServiceDetailTable({
  error,
  data,
  fetchNextPage,
  loading,
}: {
  error?: ApolloError
  data?: GetServiceDataQuery
  fetchNextPage: () => void
  loading: boolean
}) {
  const navigate = useNavigate()

  const globalService = data?.globalService
  const services = globalService?.services?.edges
  const pageInfo = globalService?.services?.pageInfo

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <FullHeightTableWrap flex={1}>
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
        reactTableOptions={{ meta: { refetch: () => undefined } }}
        reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
      />
    </FullHeightTableWrap>
  )
}
