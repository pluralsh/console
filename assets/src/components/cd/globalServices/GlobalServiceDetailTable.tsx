import { EmptyState, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
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

import { Title1H1 } from 'components/utils/typography/Text'

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
  const theme = useTheme()
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
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
        flexGrow: 1,
      }}
    >
      <Title1H1>{globalService?.name}</Title1H1>
      {!data ? (
        <LoadingIndicator />
      ) : services?.length ? (
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
            reactTableOptions={{ meta: { refetch: () => undefined } }}
            reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
          />
        </FullHeightTableWrap>
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="Looks like you don't have any service deployments yet." />
        </div>
      )}
    </div>
  )
}
