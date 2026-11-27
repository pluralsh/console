import { Chip, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { DevboxStatusChip } from 'components/workbenches/workbench/devboxes/DevboxChips'
import { devboxSizing } from 'components/workbenches/workbench/devboxes/devboxSizing'
import { agentLabel } from 'components/workbenches/workbench/devboxes/devboxStartForm'
import { DevboxTinyFragment } from 'generated/graphql'
import { DevboxesDocument } from 'generated/graphql-documents'
import { useMemo } from 'react'
import { getAiSettingsDevboxAbsPath } from 'routes/settingsRoutesConst'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export function AIDevboxes() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      query: DevboxesDocument,
      keyPath: ['devboxes'],
    })

  const devboxes = useMemo(
    () => mapExistingNodes(data?.devboxes),
    [data?.devboxes]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      minHeight={0}
    >
      <Table
        fullHeightWrap
        virtualizeRows
        data={devboxes}
        columns={columns}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        getRowLink={({ original }) =>
          getAiSettingsDevboxAbsPath((original as DevboxTinyFragment).id)
        }
        emptyStateProps={{
          message:
            'No devboxes yet. A DevboxRunner registers them from a cluster.',
        }}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<DevboxTinyFragment>()

const columns = [
  columnHelper.accessor((box) => box.name, {
    id: 'name',
    header: 'Devbox',
    // fills the row, so a hovered row highlights to the table's edge
    meta: { gridTemplate: 'minmax(0, 1fr)' },
    cell: ({ row: { original: box } }) => (
      <StackedText
        first={box.name}
        second={box.cluster?.name}
      />
    ),
  }),
  columnHelper.accessor((box) => box.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => <DevboxStatusChip status={getValue()} />,
  }),
  columnHelper.accessor((box) => devboxSizing(box.resources), {
    id: 'sizing',
    header: 'Sizing',
    cell: ({ getValue }) => getValue() ?? 'default',
  }),
  columnHelper.accessor((box) => box.agents, {
    id: 'agents',
    header: 'Agents',
    cell: ({ getValue }) => (
      <Flex
        gap="xxsmall"
        wrap="wrap"
      >
        {(getValue() ?? []).filter(isNonNullable).map((a) => (
          <Chip
            key={a.type}
            size="small"
            severity={a.default ? 'info' : 'neutral'}
          >
            {agentLabel(a.type)}
          </Chip>
        ))}
      </Flex>
    ),
  }),
  columnHelper.accessor((box) => box.lastHeartbeatAt, {
    id: 'heartbeat',
    header: 'Last heartbeat',
    cell: ({ getValue }) => {
      const at = getValue()
      return at ? fromNow(at) : 'never'
    },
  }),
]
