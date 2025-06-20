import { Modal, Table } from '@pluralsh/design-system'
import { prColumns } from 'components/self-service/pr/queue/PrQueueColumns'
import { PullRequestFragment } from 'generated/graphql'
import { ComponentProps, useMemo } from 'react'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData'

export function PipelinePullRequestsModal({
  pullRequests,
  open,
  ...props
}: {
  pullRequests: Nullable<PullRequestFragment>[]
} & ComponentProps<typeof Modal>) {
  const pullRequestEdges = useMemo(
    () => pullRequests.map((pr) => ({ node: pr })),
    [pullRequests]
  )

  return (
    <Modal
      open={open}
      header="Generated PRs"
      size="custom"
      {...props}
    >
      <PipelinePullRequestsTable pullRequestEdges={pullRequestEdges} />
    </Modal>
  )
}

export function PipelinePullRequestsTable({
  pullRequestEdges,
}: {
  pullRequestEdges: { node: Nullable<PullRequestFragment> }[]
}) {
  return (
    <Table
      fullHeightWrap
      columns={prColumns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      data={pullRequestEdges || []}
      virtualizeRows
    />
  )
}
