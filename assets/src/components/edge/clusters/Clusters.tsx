import {
  AppIcon,
  Button,
  ChipList,
  Flex,
  LoopingLogo,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import {
  ClusterRegistrationFragment,
  useClusterRegistrationsQuery,
} from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { CreateCompleteClusterRegistrationModal } from './CompleteClusterRegistrationModal.tsx'

const renderTag = (tag) => `${tag.name}${tag.value ? `: ${tag.value}` : ''}`
const columnHelper = createColumnHelper<ClusterRegistrationFragment>()

const columns = [
  columnHelper.accessor((registration) => registration.machineId, {
    id: 'machineId',
    header: 'Machine ID',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((registration) => registration.project?.name, {
    id: 'project',
    header: 'Project',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  }),
  columnHelper.accessor(() => null, {
    id: 'cluster',
    header: 'Cluster',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
    cell: ({
      row: {
        original: { name, handle },
      },
    }) => (
      <StackedText
        first={name}
        second={handle ? `handle: ${handle}` : undefined}
      />
    ),
  }),
  columnHelper.accessor((registration) => registration.tags ?? [], {
    id: 'tags',
    header: 'Tags',
    cell: ({ getValue }) => (
      <ChipList
        size="small"
        limit={1}
        values={getValue()}
        transformValue={renderTag}
        tooltip
        truncateWidth={150}
        emptyState={null}
      />
    ),
  }),
  columnHelper.accessor((registration) => registration.creator, {
    id: 'creator',
    header: 'Creator',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
    cell: ({ getValue }) => {
      const creator = getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          {(creator?.profile || creator?.name) && (
            <AppIcon
              url={creator?.profile ?? undefined}
              name={creator?.name}
              size="xxsmall"
              spacing="none"
            />
          )}
          {creator?.email}
        </Flex>
      )
    },
  }),
  columnHelper.accessor((registration) => registration.insertedAt, {
    id: 'insertedAt',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(() => null, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: function Cell({
      row: {
        original: { id, machineId, name },
      },
      table,
    }) {
      const { refetch } = table.options.meta as { refetch?: () => void }
      const [open, setOpen] = useState(false)

      return (
        <>
          {!name && (
            <Button
              small
              onClick={() => setOpen(true)}
            >
              Complete
            </Button>
          )}
          <CreateCompleteClusterRegistrationModal
            id={id}
            machineId={machineId}
            open={open}
            onClose={() => setOpen(false)}
            refetch={refetch}
          />
        </>
      )
    },
  }),
]

export default function Clusters(): ReactNode {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useClusterRegistrationsQuery,
    keyPath: ['clusterRegistrations'],
  })

  const clusterRegistrations = useMemo(
    () => mapExistingNodes(data?.clusterRegistrations),
    [data?.clusterRegistrations]
  )

  if (error) return <GqlError error={error} />
  if (!data) return <LoopingLogo />

  return (
    <Table
      fullHeightWrap
      columns={columns}
      reactTableOptions={{ meta: { refetch } }}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      data={clusterRegistrations}
      virtualizeRows
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}
