import { useCallback } from 'react'
import {
  AppIcon,
  Card,
  EmptyState,
  GlobeIcon,
  Table,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGetServiceDataQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { Body2BoldP, Body2P, Title1H1 } from 'components/utils/typography/Text'

import { getDistroProviderIconUrl } from 'components/utils/ClusterDistro'

import {
  SERVICES_QUERY_PAGE_SIZE,
  SERVICES_REACT_VIRTUAL_OPTIONS,
  columns,
} from '../services/Services'

export function GlobalServiceDetailTable({
  serviceId,
}: {
  serviceId?: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  const queryResult = useGetServiceDataQuery({
    variables: {
      first: SERVICES_QUERY_PAGE_SIZE,
      serviceId: serviceId || '',
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

  const globalService = data?.globalService
  const services = globalService?.services?.edges
  const pageInfo = globalService?.services?.pageInfo

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!prev.globalService) return prev

        return {
          ...prev,
          globalService: extendConnection(
            prev.globalService,
            fetchMoreResult.globalService?.services,
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
      <Title1H1>{globalService?.name}</Title1H1>

      <Card
        padding="large"
        css={{
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        <div css={{ flexGrow: 1 }}>
          <Body2BoldP>Distribution</Body2BoldP>
          <div
            css={{
              ...theme.partials.text.body2,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            <AppIcon
              spacing="padding"
              size="xxsmall"
              icon={globalService?.distro ? undefined : <GlobeIcon size={16} />}
              url={
                globalService?.distro
                  ? getDistroProviderIconUrl({
                      distro: globalService?.distro,
                      provider: globalService?.provider?.cloud,
                      mode: theme.mode,
                    })
                  : undefined
              }
            />
            {globalService?.distro || 'All distribution'}
          </div>
        </div>
        <div css={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Body2BoldP>Tags</Body2BoldP>
          <Body2P>
            {globalService?.tags
              ?.map((tag) => `${tag?.name}: ${tag?.value}`)
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
