import { useState } from 'react'
import {
  Input2,
  LoopingLogo,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { type Row } from '@tanstack/react-table'
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { PipelineFragment, usePipelinesQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData'

import { useProjectId } from '../../contexts/ProjectsContext'

import { columns } from './PipelinesColumns'

export const PIPELINES_CRUMBS = [
  ...CD_BASE_CRUMBS,
  { label: 'pipelines', url: PIPELINES_ABS_PATH },
]

export default function PipelineList() {
  const theme = useTheme()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)

  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      {
        queryHook: usePipelinesQuery,
        keyPath: ['pipelines'],
      },
      {
        q: debouncedSearchString,
        projectId,
      }
    )

  useSetBreadcrumbs(PIPELINES_CRUMBS)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
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
      <div css={{ display: 'flex', minWidth: 0, gap: theme.spacing.medium }}>
        <Input2
          placeholder="Search"
          startIcon={<SearchIcon />}
          showClearButton
          value={searchString}
          onChange={(e) => setSearchString(e.currentTarget.value)}
          css={{ flexGrow: 1 }}
        />
      </div>
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          data={data?.pipelines?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onRowClick={(_e, { original }: Row<Edge<PipelineFragment>>) => {
            navigate(`${PIPELINES_ABS_PATH}/${original.node?.id}`)
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
