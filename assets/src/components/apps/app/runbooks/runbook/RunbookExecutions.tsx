import { Avatar, Table } from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'
import { Flex } from 'honorable'
import { Date } from 'components/utils/Date'
import { useCallback, useMemo } from 'react'
import update from 'lodash/update'

const columnHelper = createColumnHelper<any>()

const columns = [
  columnHelper.accessor(row => row.insertedAt, {
    id: 'insertedAt',
    cell: (insertedAt: any) => <Date date={insertedAt.getValue()} />,
    header: 'Date',
  }),
  columnHelper.accessor(row => row.user, {
    id: 'user',
    cell: (user: any) => (
      <Flex
        align="center"
        direction="row"
        gap="xsmall"
      >
        {/* TODO: Update it in design system. */}
        <Avatar
          name={user.getValue().name}
          size={32}
        />
        {user.getValue().email}
      </Flex>
    ),
    header: 'Actor',
  }),
  columnHelper.accessor(row => row.context, {
    id: 'context',
    cell: (context: any) => JSON.stringify(context.getValue()),
    header: 'Context',
  }),
]

const FETCH_MARGIN = 30

export function RunbookExecutions({ runbook, loading, fetchMore }) {
  const { edges, pageInfo } = runbook.executions
  const executions = useMemo(() => edges.map(({ node }) => node), [edges])

  const fetchMoreOnBottomReached = useCallback((element?: HTMLDivElement | undefined) => {
    if (!element) return

    const { scrollHeight, scrollTop, clientHeight } = element

      // Once scrolled within FETCH_MARGIN of the bottom of the table, fetch more data if there is any.
    if (scrollHeight - scrollTop - clientHeight < FETCH_MARGIN && !loading && pageInfo.hasNextPage) {
      console.log(pageInfo)

      fetchMore({
        variables: { cursor: pageInfo.endCursor },
        updateQuery: (prev, { fetchMoreResult: { runbook: { executions: nextExecutions } } }) => {
          const { edges, pageInfo } = nextExecutions

          return update(prev, 'runbook.executions', executions => ({ edges: [...executions.edges, ...edges], pageInfo }))
        },
      })
    }
  },
  [fetchMore, loading, pageInfo])

  return (
    <Table
      data={executions}
      columns={columns}
      height={200}
      onScrollCapture={e => fetchMoreOnBottomReached(e?.target)} // TODO: Add it to design system. Using onScrollCapture as onScroll is already used.
    />
  )
}
