import { Avatar, LoopingLogo, Table } from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'
import { Flex } from 'honorable'
import { Date } from 'components/utils/Date'
import { useCallback, useMemo } from 'react'
import update from 'lodash/update'
import { RUNBOOK_EXECUTIONS_Q } from 'components/runbooks/queries'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'

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

export function RunbookExecutions() {
  const { appName, runbookName } = useParams()
  const { data, loading, fetchMore }: any = useQuery(RUNBOOK_EXECUTIONS_Q, {
    variables: { namespace: appName, name: runbookName },
    fetchPolicy: 'cache-and-network',
  })

  const runbook = data?.runbook
  const pageInfo = runbook?.executions?.pageInfo
  const edges = runbook?.executions?.edges
  const executions = useMemo(() => edges?.map(({ node }) => node), [edges])

  const fetchMoreOnBottomReached = useCallback((element?: HTMLDivElement | undefined) => {
    if (!element) return

    const { scrollHeight, scrollTop, clientHeight } = element

    // Once scrolled within FETCH_MARGIN of the bottom of the table, fetch more data if there is any.
    if (scrollHeight - scrollTop - clientHeight < FETCH_MARGIN && !loading && pageInfo.hasNextPage) {
      fetchMore({
        variables: { cursor: pageInfo.endCursor },
        updateQuery: (prev, { fetchMoreResult: { runbook: { executions: { edges, pageInfo } } } }) => update(prev, 'runbook.executions', executions => ({ edges: [...executions.edges, ...edges], pageInfo })),
      })
    }
  }, [fetchMore, loading, pageInfo])

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  return (
    <Table
      data={executions}
      columns={columns}
      onScrollCapture={e => fetchMoreOnBottomReached(e?.target)}
      maxHeight="calc(100vh - 244px)" // TODO: Set design system to use flex.
    />
  )
}
