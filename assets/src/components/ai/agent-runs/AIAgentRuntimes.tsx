import {
  Chip,
  Flex,
  IconFrame,
  PeopleIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { AgentRuntimeFragment, useAgentRuntimesQuery } from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { ClusterNameAndIcon } from '../../cd/services/ServicesColumns.tsx'
import { AIAgentRuntimePermissionsModal } from './AIAgentRuntimePermissionsModal.tsx'

export function AIAgentRuntimes() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useAgentRuntimesQuery, keyPath: ['agentRuntimes'] },
      {}
    )

  const runtimes = useMemo(
    () => mapExistingNodes(data?.agentRuntimes),
    [data?.agentRuntimes]
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
        data={runtimes}
        columns={columns}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No runtimes found.' }}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<AgentRuntimeFragment>()

const columns = [
  columnHelper.accessor((runtime) => truncate(runtime.name, { length: 60 }), {
    id: 'name',
    header: 'Name',
  }),
  columnHelper.accessor((runtime) => runtime.default, {
    id: 'default',
    header: 'Default',
    cell: ({ getValue }) =>
      getValue() ? (
        <Chip
          size="small"
          severity="info"
        >
          Default
        </Chip>
      ) : undefined,
  }),
  columnHelper.accessor((runtime) => runtime.aiProxy, {
    id: 'aiProxy',
    header: 'AI Proxy',
    cell: ({ getValue }) =>
      getValue() ? (
        <Chip
          size="small"
          severity="info"
        >
          Enabled
        </Chip>
      ) : undefined,
  }),
  columnHelper.accessor((runtime) => runtime.cluster, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => <ClusterNameAndIcon cluster={getValue()} />,
  }),
  columnHelper.accessor((runtime) => truncate(runtime.name, { length: 60 }), {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: function Cell({ row: { original } }) {
      const [open, setOpen] = useState(false)

      return (
        <>
          <IconFrame
            clickable
            icon={<PeopleIcon />}
            onClick={() => setOpen(true)}
            tooltip="Manage permissions"
            type="floating"
          />
          <AIAgentRuntimePermissionsModal
            id={original.id}
            header={`${original.name} agent runtime permissions`}
            name={original.name}
            bindings={original.createBindings}
            open={open}
            onClose={() => setOpen(false)}
          />
        </>
      )
    },
  }),
]
