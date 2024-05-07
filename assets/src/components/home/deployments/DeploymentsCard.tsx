import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import {
  ServiceDeploymentStatus,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import {
  SERVICES_QUERY_PAGE_SIZE,
  SERVICES_REACT_VIRTUAL_OPTIONS,
} from 'components/cd/services/Services'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import styled from 'styled-components'

import { HomeCard } from '../HomeCard'

import { DeploymentsTable } from './DeploymentsTable'

export function DeploymentsCard() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useServiceDeploymentsQuery,
      pageSize: SERVICES_QUERY_PAGE_SIZE,
      queryKey: 'serviceDeployments',
    },
    {
      status: ServiceDeploymentStatus.Failed,
    }
  )

  if (error) {
    return <GqlError error={error} />
  }
  if (!data?.serviceDeployments?.edges) {
    return <LoadingIndicator />
  }

  const numDeployments = data.serviceDeployments.edges.length
  const headerText =
    numDeployments === 1
      ? `1 Deployment created an error`
      : `${numDeployments} Deployments creating errors`

  return (
    <HomeCard label={headerText}>
      <DeploymentsTableWrapperSC>
        <DeploymentsTable
          data={data.serviceDeployments.edges}
          emptyStateProps={{ message: 'All services healthy!' }}
          refetch={refetch}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
          onVirtualSliceChange={setVirtualSlice}
        />
      </DeploymentsTableWrapperSC>
    </HomeCard>
  )
}

const DeploymentsTableWrapperSC = styled.div({
  overflow: 'auto',
})
