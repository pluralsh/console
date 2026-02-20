import { Button, PrOpenIcon, Table, Tooltip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import {
  PipelineContextFragment,
  PipelineFragment,
  usePipelineContextsQuery,
} from 'generated/graphql'
import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edge } from 'utils/graphql'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { PipelinePullRequestsModal } from './PipelinePullRequests'

export const columnHelper = createColumnHelper<Edge<PipelineContextFragment>>()

const ColId = columnHelper.accessor((row) => row.node?.id, {
  id: 'id',
  header: 'Context ID',
  meta: { truncate: true },
  cell: function Cell(props) {
    return (
      <Tooltip
        label={props.getValue()}
        placement="top"
      >
        <span> {props.getValue()} </span>
      </Tooltip>
    )
  },
})

export const tableInteractiveTargetingProp =
  'data-plural-table-interactive' as const

export function TableInteractive({ children }: { children: ReactNode }) {
  return (
    <div
      {...{ [tableInteractiveTargetingProp]: '' }}
      style={{ display: 'contents' }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export const ColJSON = columnHelper.accessor((row) => row.node?.context, {
  id: 'json',
  header: 'JSON',
  cell: function Cell(props) {
    let jsonString = ''

    try {
      jsonString = JSON.stringify(props.getValue())
    } catch {
      jsonString = ''
    }

    return jsonString
  },
})

const ColPrs = columnHelper.display({
  id: 'prs',
  header: 'Generated PRs',
  cell: function Cell({ row: { original } }) {
    const [open, setOpen] = useState(false)
    const pullRequests = original.node?.pullRequests

    if (!pullRequests?.length) {
      return null
    }

    return (
      <TableInteractive>
        <Button
          secondary
          startIcon={<PrOpenIcon />}
          onClick={() => setOpen(true)}
        >
          View PRs
        </Button>
        <PipelinePullRequestsModal
          pullRequests={pullRequests}
          open={open}
          onClose={() => setOpen(false)}
        />
      </TableInteractive>
    )
  },
})

const ColInsertedAt = columnHelper.accessor((row) => row.node?.insertedAt, {
  id: 'insertedAt',
  header: 'Created',
  cell: function Cell(props) {
    return <DateTimeCol date={props.getValue()} />
  },
})
const ColUpdatedAt = columnHelper.accessor((row) => row.node?.updatedAt, {
  id: 'updatedAt',
  header: 'Updated',
  cell: function Cell(props) {
    return <DateTimeCol date={props.getValue()} />
  },
})

const columns = [ColId, ColJSON, ColPrs, ColInsertedAt, ColUpdatedAt]

export function PipelineContexts({
  pipeline,
}: {
  pipeline: Nullable<PipelineFragment>
}) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: usePipelineContextsQuery,
        keyPath: ['pipeline', 'contexts'],
      },
      { id: pipeline?.id ?? '' }
    )
  const tableData = data?.pipeline?.contexts?.edges ?? []

  if (!pipeline) return null
  if (error) return <GqlError error={error} />

  return (
    <Table
      loose
      fullHeightWrap
      virtualizeRows
      data={tableData}
      columns={columns}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      getRowLink={({ original }) => {
        const { node } = original as Edge<PipelineContextFragment>
        return (
          <Link
            to={`${PIPELINES_ABS_PATH}/${pipeline?.id}/context/${node?.id}`}
          />
        )
      }}
      emptyStateProps={{ message: 'No contexts available.' }}
    />
  )
}
