import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { PullRequestEdge, useStackPrsQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useCallback, useState } from 'react'

import { PrStackRunsAccordion } from './PrStackRunsAccordion'

export function StackPrs() {
  const { stackId } = useParams()
  const [openRowIdx, setOpenRowIdx] = useState(-1)

  const reactTableOptions = {
    meta: { openRowIdx, setOpenRowIdx },
  }

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
    <FullHeightTableWrap>
      <Table
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
        reactVirtualOptions={{ overscan: 10 }}
        css={{ height: '100%' }}
        emptyStateProps={{
          message: 'No PRs found',
        }}
      />
    </FullHeightTableWrap>
  )
}

const columnHelper = createColumnHelper<PullRequestEdge>()
const ColAccordion = columnHelper.accessor((edge) => edge.node, {
  id: 'accordion',
  cell: function Cell({ getValue, table, row }) {
    const pr = getValue()
    const isOpen = table?.options?.meta?.openRowIdx === row.index

    const toggleOpen = useCallback(
      (open: boolean) => {
        if (open) {
          table?.options?.meta?.setOpenRowIdx(row.index)
        } else {
          table?.options?.meta?.setOpenRowIdx(-1)
        }
      },
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
})

const cols = [ColAccordion]
