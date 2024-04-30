import { Modal, Table } from '@pluralsh/design-system'
import { PullRequestFragment } from 'generated/graphql'
import { ComponentProps, useMemo } from 'react'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { prColumns } from 'components/pr/queue/PrQueueColumns'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useTheme } from 'styled-components'

import { REACT_VIRTUAL_OPTIONS } from './PipelineContexts'

export function PipelinePullRequestsModal({
  pullRequests,
  ...props
}: {
  pullRequests: Nullable<PullRequestFragment>[]
} & ComponentProps<typeof Modal>) {
  const theme = useTheme()
  const pullRequestEdges = useMemo(
    () => pullRequests.map((pr) => ({ node: pr })),
    [pullRequests]
  )

  return (
    <ModalMountTransition open={!!props.open}>
      <Modal
        portal
        header="Generated PRs"
        width="auto"
        maxWidth={`calc( 100vw - ${theme.spacing.xlarge * 2}px)`}
        {...props}
      >
        <FullHeightTableWrap>
          <PipelinePullRequestsTable pullRequestEdges={pullRequestEdges} />
        </FullHeightTableWrap>
      </Modal>
    </ModalMountTransition>
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
