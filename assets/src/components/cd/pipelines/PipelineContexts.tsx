import {
  Button,
  Modal,
  PrOpenIcon,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { Row, createColumnHelper } from '@tanstack/react-table'
import {
  PipelineContextRowFragment,
  PipelineFragment,
  PullRequestFragment,
  usePipelineContextsQuery,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { ComponentProps, useMemo, useState } from 'react'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { columns as pullRequestsColumns } from 'components/pr/queue/PrQueueColumns'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

type RowData = Edge<PipelineContextRowFragment>
export const columnHelper = createColumnHelper<RowData>()
export const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}
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
        <> {props.getValue()} </>
      </Tooltip>
    )
  },
})

const ColService = columnHelper.accessor(() => 'TODO', {
  id: 'service',
  header: 'Service',
  cell: function Cell(props) {
    return props.getValue()
  },
})

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
      <>
        <Button
          secondary
          startIcon={<PrOpenIcon />}
          onClick={() => setOpen(true)}
        >
          View PRs
        </Button>
        <PullRequestsModal
          pullRequests={pullRequests}
          open={open}
          onClose={() => setOpen(false)}
        />
      </>
    )
  },
})

function PullRequestsModal({
  pullRequests,
  ...props
}: {
  pullRequests: Nullable<PullRequestFragment>[]
} & ComponentProps<typeof Modal>) {
  const tableData = useMemo(
    () => pullRequests.map((pr) => ({ node: pr })),
    [pullRequests]
  )

  return (
    <ModalMountTransition open={!!props.open}>
      <Modal
        header="Generated PRs"
        {...props}
      >
        <FullHeightTableWrap>
          <Table
            columns={pullRequestsColumns}
            reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            data={tableData || []}
            virtualizeRows
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      </Modal>
    </ModalMountTransition>
  )
}

const ColInsertedAt = columnHelper.accessor((row) => row.node?.insertedAt, {
  id: 'insertedAt',
  header: 'Creation time',
  cell: function Cell(props) {
    return <DateTimeCol date={props.getValue()} />
  },
})

const ColStatus = columnHelper.accessor(() => 'TODO', {
  id: 'insertedAt',
  header: 'Status',
  cell: function Cell(props) {
    return <DateTimeCol date={props.getValue()} />
  },
})

const columns = [ColId, ColService, ColJSON, ColPrs, ColInsertedAt, ColStatus]

export function PipelineContexts({
  pipeline,
}: {
  pipeline: Nullable<PipelineFragment>
}) {
  const navigate = useNavigate()

  const { data, error } = usePipelineContextsQuery({
    variables: { id: pipeline?.id || '', first: 100 },
    skip: !pipeline?.id,
  })
  const tableData = data?.pipeline?.contexts?.edges ?? []

  console.log('pipeline contexts error', error)

  return (
    <Table
      loose
      data={tableData}
      columns={columns}
      onRowClick={(_e, { original }: Row<RowData>) => navigate(`/todo`)}
      emptyStateProps={{ message: 'No contexts available.' }}
    />
  )
}
