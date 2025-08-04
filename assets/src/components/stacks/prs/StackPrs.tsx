import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { PullRequestEdge, useStackPrsQuery } from 'generated/graphql'
import { useOutletContext, useParams } from 'react-router-dom'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useCallback, useMemo, useState } from 'react'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

import { PrStackRunsAccordion } from './PrStackRunsAccordion'

export function StackPrs() {
  const { stackId } = useParams()
  const { stack } = useOutletContext() as StackOutletContextT

  const [openRowIdx, setOpenRowIdx] = useState(-1)

  const reactTableOptions = {
    meta: { openRowIdx, setOpenRowIdx },
  }

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
      { id: stackId ?? '' }
    )
  const prs = data?.infrastructureStack?.pullRequests?.edges

  if (error) return <GqlError error={error} />
  if (!prs) return <LoadingIndicator />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      data={prs}
      padCells={false}
      columns={cols}
      hideHeader
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      reactTableOptions={reactTableOptions}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      css={{ height: '100%' }}
      emptyStateProps={{
        message: 'No PRs found.',
      }}
    />
  )
}

const columnHelper = createColumnHelper<PullRequestEdge>()

const cols = [
  columnHelper.accessor((edge) => edge.node, {
    id: 'accordion',
    cell: function Cell({ getValue, table, row }) {
      const pr = getValue()
      const isOpen = table?.options?.meta?.openRowIdx === row.index

      const toggleOpen = useCallback(
        (open: boolean) =>
          table?.options?.meta?.setOpenRowIdx(open ? row.index : -1),
        [row.index, table?.options?.meta]
      )

      return pr ? (
        <PrStackRunsAccordion
          isOpen={isOpen}
          toggleOpen={toggleOpen}
          pr={pr}
        />
      ) : null
    },
  }),
]
