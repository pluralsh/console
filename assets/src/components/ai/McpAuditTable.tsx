import { AppIcon, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import {
  McpServerAuditFragment,
  useMcpServerAuditsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

import { GqlError } from 'components/utils/Alert'
import { JsonExpanderCard } from 'components/utils/JsonExpanderCard'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

const columnHelper = createColumnHelper<McpServerAuditFragment>()

export function McpAuditTable({ id }: { id: string }) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useMcpServerAuditsQuery, keyPath: ['mcpServer', 'audits'] },
      { id }
    )

  const audits = useMemo(
    () => mapExistingNodes(data?.mcpServer?.audits),
    [data]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      fillLevel={1}
      width={768}
      loading={!data && loading}
      data={audits}
      columns={columns}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No audits found.' }}
    />
  )
}

const columns = [
  columnHelper.accessor((audit) => audit.tool, {
    id: 'tool',
    header: 'Tool',
  }),
  columnHelper.accessor((audit) => audit.arguments, {
    id: 'arguments',
    header: 'Arguments',
    cell: function Cell({ getValue }) {
      return <JsonExpanderCard json={getValue() ?? {}} />
    },
  }),
  columnHelper.accessor((audit) => audit.actor, {
    id: 'actor',
    header: 'Actor',
    cell: function Cell({ getValue }) {
      const actor = getValue()
      if (!actor) return null
      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          <AppIcon
            url={actor.profile || undefined}
            name={actor.name}
            size="xxsmall"
          />
          {actor.email}
        </Flex>
      )
    },
  }),
  columnHelper.accessor((audit) => audit.insertedAt, {
    id: 'insertedAt',
    header: 'Timestamp',
    cell: (insertedAt) => <DateTimeCol date={insertedAt.getValue() || ''} />,
  }),
]
