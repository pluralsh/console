import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import {
  ServiceDeploymentStatus,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import pluralize from 'pluralize'

import { Title2H1 } from '../../utils/typography/Text'
import { HOME_CARD_MAX_HEIGHT } from '../HomeCard'

import { useProjectId } from '../../contexts/ProjectsContext'

import { DeploymentsTable } from './DeploymentsTable'

export function DeploymentsCard() {
  const projectId = useProjectId()
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
      keyPath: ['serviceDeployments'],
    },
    { status: ServiceDeploymentStatus.Failed, projectId }
  )

  if (error) {
    return <GqlError error={error} />
  }

  const numDeployments = data?.serviceDeployments?.edges?.length

  return (
    <div>
      <Title2H1>
        {numDeployments} {pluralize('deployment', numDeployments)} creating
        errors
      </Title2H1>
      <DeploymentsTable
        data={data?.serviceDeployments?.edges}
        emptyStateProps={{ message: 'All services healthy!' }}
        refetch={refetch}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
        css={{ maxHeight: HOME_CARD_MAX_HEIGHT }}
      />
    </div>
  )
}
