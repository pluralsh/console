import {
  ArrowTopRightIcon,
  DropdownArrowIcon,
  IconFrame,
  ReloadIcon,
  Table,
  Toast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  PullRequestFragment,
  useKickStackPullRequestMutation,
  useStackPrsQuery,
} from 'generated/graphql'
import { Link, useOutletContext } from 'react-router-dom'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { useMemo } from 'react'

import { getBreadcrumbs, StackOutletContextT } from '../Stacks'

import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { StackRunsTable } from '../runs/StackRunsTable'

export function StackPrs() {
  const { stack } = useOutletContext<StackOutletContextT>()

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'prs' }],
      [stack]
    )
  )

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useStackPrsQuery,
        keyPath: ['infrastructureStack', 'pullRequests'],
      },
      { id: stack.id ?? '' }
    )

  const prs = useMemo(
    () => mapExistingNodes(data?.infrastructureStack?.pullRequests),
    [data?.infrastructureStack?.pullRequests]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      fullHeightWrap
      data={prs}
      padCells={false}
      columns={cols}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      renderExpanded={({ row }) => (
        <StackPrsExpandedRow
          pr={row.original}
          stackId={stack.id ?? ''}
        />
      )}
      onRowClick={(_, row) => row.toggleExpanded()}
      expandedRowType="custom"
      emptyStateProps={{ message: 'No PRs found.' }}
    />
  )
}

const columnHelper = createColumnHelper<PullRequestFragment>()

const cols = [
  columnHelper.accessor((pr) => pr, {
    id: 'accordion',
    cell: function Cell({ getValue, row }) {
      const { title, status, creator, id, url } = getValue()

      return (
        <TriggerWrapperSC>
          <TriggerArrowSC data-open={row.getIsExpanded()} />
          <span css={{ flex: 1 }}>{title}</span>
          <PrStatusChip status={status} />
          {creator && <span>created by {creator}</span>}
          <ResyncStackPr id={id} />
          <IconFrame
            clickable
            as={Link}
            icon={<ArrowTopRightIcon />}
            to={url}
            target="_blank"
            rel="noopener noreferrer"
          />
        </TriggerWrapperSC>
      )
    },
  }),
]

function StackPrsExpandedRow({
  pr,
  stackId,
}: {
  pr: PullRequestFragment
  stackId: string
}) {
  return (
    <StackRunsTable
      flush
      virtualizeRows={false}
      fillLevel={2}
      variables={{ id: stackId, pullRequestId: pr.id }}
      options={{ pollInterval: 5_000 }}
      height={400}
      borderRadius={0}
      paddingLeft={24}
    />
  )
}

function ResyncStackPr({ id }: { id: string }) {
  const [mutation, { loading, error }] = useKickStackPullRequestMutation({
    variables: { id },
  })

  return (
    <>
      <IconFrame
        disabled={loading}
        clickable
        type="floating"
        tooltip="Resync"
        icon={<ReloadIcon />}
        onClick={(e) => {
          e.stopPropagation()
          mutation()
        }}
      />
      {error && (
        <Toast
          heading="Resync error"
          severity="danger"
          closeTimeout={4500}
          margin="large"
          marginRight="xxxxlarge"
        >
          {error.message}
        </Toast>
      )}
    </>
  )
}

const TriggerWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  width: '100%',
  ...theme.partials.text.body2Bold,
  color: theme.colors['text-light'],
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: `${theme.spacing.medium}px`,
  cursor: 'pointer',
  background: theme.colors['fill-one'],
  '&:hover': {
    background: theme.colors['fill-one-hover'],
  },
}))

const TriggerArrowSC = styled(DropdownArrowIcon)(({ theme }) => ({
  transition: 'transform 0.25s ease',
  transform: 'rotate(-90deg)',
  width: theme.spacing.medium,
  '&[data-open="true"]': { transform: 'rotate(0deg)' },
}))
