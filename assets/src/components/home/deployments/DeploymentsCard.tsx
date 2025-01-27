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

import { OverlineH1 } from '../../utils/typography/Text'
import { HOME_CARD_MAX_HEIGHT } from '../HomeCard'

import { useProjectId } from '../../contexts/ProjectsContext'

import { DeploymentsTable } from './DeploymentsTable'
import { useTheme } from 'styled-components'

export function DeploymentsCard() {
  const theme = useTheme()
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
    <div
      css={{
        '@media (min-width: 1168px)': {
          width: '50%',
        },
      }}
    >
      <OverlineH1
        css={{
          color: theme.colors['text-xlight'],
          marginBottom: theme.spacing.small,
        }}
      >
        {numDeployments} {pluralize('deployment', numDeployments)} creating
        errors
      </OverlineH1>
      <DeploymentsTable
        data={data?.serviceDeployments?.edges ?? []}
        loading={!data && loading}
        loadingSkeletonRows={3}
        emptyStateProps={{ message: 'All services healthy!' }}
        refetch={refetch}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
        maxHeight={HOME_CARD_MAX_HEIGHT}
      />
    </div>
  )
}
