import { Modal, Table } from '@pluralsh/design-system'
import { prColumns } from 'components/pr/queue/PrQueueColumns'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { PullRequestFragment } from 'generated/graphql'
import { ComponentProps, useMemo } from 'react'

import { REACT_VIRTUAL_OPTIONS } from './PipelineContexts'

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
      <FullHeightTableWrap>
        <PipelinePullRequestsTable pullRequestEdges={pullRequestEdges} />
      </FullHeightTableWrap>
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
      columns={prColumns}
      reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
      data={pullRequestEdges || []}
      virtualizeRows
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}
