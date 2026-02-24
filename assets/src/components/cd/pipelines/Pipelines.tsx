import {
  Flex,
  Input2,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { GqlError } from 'components/utils/Alert'
import { PipelineFragment, usePipelinesQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { useProjectId } from '../../contexts/ProjectsContext'

import { columns } from './PipelinesColumns'

export const PIPELINES_CRUMBS = [
  ...CD_BASE_CRUMBS,
  { label: 'pipelines', url: PIPELINES_ABS_PATH },
]

export function Pipelines() {
  const projectId = useProjectId()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)

  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      { queryHook: usePipelinesQuery, keyPath: ['pipelines'] },
      { q: debouncedSearchString, projectId }
    )

  useSetBreadcrumbs(PIPELINES_CRUMBS)

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Input2
        placeholder="Search pipelines"
        startIcon={<SearchIcon />}
        showClearButton
        value={searchString}
        onChange={(e) => setSearchString(e.currentTarget.value)}
        css={{ flexGrow: 1 }}
      />
      <Table
        fullHeightWrap
        columns={columns}
        loading={!data && loading}
        data={data?.pipelines?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        getRowLink={({ original }) => {
          const { node } = original as Edge<PipelineFragment>
          return <Link to={`${PIPELINES_ABS_PATH}/${node?.id}`} />
        }}
      />
    </Flex>
  )
}
