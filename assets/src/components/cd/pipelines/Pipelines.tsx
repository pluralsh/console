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

import { PRS_REACT_VIRTUAL_OPTIONS } from 'components/pr/queue/PrQueue'

import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { PipelineFragment, usePipelinesQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'

import { columns } from './PipelinesColumns'

export const QUERY_PAGE_SIZE = 100

export const PIPELINES_CRUMBS = [
  ...CD_BASE_CRUMBS,
  { label: 'pipelines', url: PIPELINES_ABS_PATH },
]

export default function PipelineList() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)

  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      {
        queryHook: usePipelinesQuery,
        pageSize: QUERY_PAGE_SIZE,
        queryKey: 'pipelines',
      },
      {
        q: debouncedSearchString,
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
          reactVirtualOptions={PRS_REACT_VIRTUAL_OPTIONS}
          data={data?.pipelines?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onRowClick={(_e, { original }: Row<Edge<PipelineFragment>>) => {
            navigate(`${PIPELINES_ABS_PATH}/${original.node?.id}`)
          }}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
