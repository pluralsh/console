import { EmptyState, Table } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useProjectsQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import ProjectCreate from './ProjectCreate'
import { projectSettingsCols } from './ProjectSettingsColumns'

export const PROJECTS_QUERY_PAGE_SIZE = 100

export function ProjectsList() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useProjectsQuery,
      keyPath: ['projects'],
      pageSize: PROJECTS_QUERY_PAGE_SIZE,
    })

  const projects = useMemo(
    () => data?.projects?.edges?.map((edge) => edge?.node),
    [data?.projects?.edges]
  )

  if (error) return <GqlError error={error} />
  if (!data?.projects?.edges) return <LoadingIndicator />

  return !isEmpty(projects) ? (
    <GridTableWrapper>
      <Table
        virtualizeRows
        rowBg="raised"
        data={projects || []}
        columns={projectSettingsCols}
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      />
    </GridTableWrapper>
  ) : (
    <EmptyState message="Looks like you don't have any projects yet.">
      <ProjectCreate />
    </EmptyState>
  )
}
