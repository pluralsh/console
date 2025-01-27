import { Button, PrOpenIcon, Table, Tooltip } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { Row, createColumnHelper } from '@tanstack/react-table'
import {
  PipelineContextFragment,
  PipelineFragment,
  usePipelineContextsQuery,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { ReactNode, useState } from 'react'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { PipelinePullRequestsModal } from './PipelinePullRequests'

type RowData = Edge<PipelineContextFragment>
export const columnHelper = createColumnHelper<RowData>()

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
  const navigate = useNavigate()

  const { data } = usePipelineContextsQuery({
    variables: { id: pipeline?.id || '', first: 100 },
    fetchPolicy: 'cache-and-network',
    skip: !pipeline?.id,
  })
  const tableData = data?.pipeline?.contexts?.edges ?? []

  if (!pipeline?.id) return null

  return (
    <Table
      fullHeightWrap
      loose
      data={tableData}
      columns={columns}
      onRowClick={(_e, { original }: Row<RowData>) =>
        navigate(
          `${PIPELINES_ABS_PATH}/${pipeline?.id}/context/${original.node?.id}`
        )
      }
      emptyStateProps={{ message: 'No contexts available.' }}
    />
  )
}
