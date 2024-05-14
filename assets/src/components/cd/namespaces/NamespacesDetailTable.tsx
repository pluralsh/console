import { useCallback } from 'react'
import { Card, EmptyState, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGetManagedNamespaceQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { Body2BoldP, Body2P, Title1H1 } from 'components/utils/typography/Text'

import {
  SERVICES_QUERY_PAGE_SIZE,
  SERVICES_REACT_VIRTUAL_OPTIONS,
  columns,
} from '../services/Services'

export function NamespacesDetailTable({
  namespaceId,
}: {
  namespaceId?: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  const queryResult = useGetManagedNamespaceQuery({
    variables: {
      first: SERVICES_QUERY_PAGE_SIZE,
      namespaceId: namespaceId || '',
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

  const managedNamespace = data?.managedNamespace
  const services = managedNamespace?.services?.edges
  const pageInfo = managedNamespace?.services?.pageInfo

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!prev.managedNamespace) return prev

        return {
          ...prev,
          managedNamespace: extendConnection(
            prev.managedNamespace,
            fetchMoreResult.managedNamespace?.services,
            'services'
          ),
        }
      },
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
      <Title1H1>{managedNamespace?.name}</Title1H1>
      <Card
        padding="large"
        css={{
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        <div css={{ flexGrow: 1 }}>
          <Body2BoldP>Description</Body2BoldP>
          <Body2P
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            {managedNamespace?.description || '--'}
          </Body2P>
        </div>
        <div css={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Body2BoldP>Labels</Body2BoldP>
          <Body2P>
            {Object.keys(managedNamespace?.labels || {})
              ?.map((label) => `${label}: ${managedNamespace?.labels?.[label]}`)
              .join(', ')}
          </Body2P>
        </div>
      </Card>

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
