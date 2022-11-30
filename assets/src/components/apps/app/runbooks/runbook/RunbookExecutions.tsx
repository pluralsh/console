import { Avatar, Table } from '@pluralsh/design-system'
import { Box } from 'grommet'

import { createColumnHelper } from '@tanstack/react-table'
import { Flex } from 'honorable'
import { Date } from 'components/utils/Date'
import { useMemo } from 'react'

//       <HeaderItem
//         width="30%"
//         text={moment(insertedAt).format('lll')}
//       />
//   )
// }

export function Placeholder() {
  return (
    <Box
      fill="horizontal"
      height="40px"
    />
  )
}

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
        {/* TODO: Update it it design system. */}
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

export function RunbookExecutions({ runbook, loading, fetchMore }) {
  const { edges, pageInfo } = runbook.executions
  const executions = useMemo(() => edges.map(({ node }) => node), [edges])

  return (
    <Table
      data={executions}
      columns={columns}
      height="100%"
    />
    //   <StandardScroller
    //     loading={loading}
    //     placeholder={Placeholder}
    //     hasNextPage={pageInfo.hasNextPage}
    //     loadNextPage={() => pageInfo.hasNextPage && fetchMore({
    //       variables: { cursor: pageInfo.endCursor },
    //       updateQuery: (prev, { fetchMoreResult: { runbook } }) => (
    //         { ...prev, runbook: extendConnection(prev, runbook.executions, 'executions') }
    //       ),
    //     })}
    //   />
  )
}
