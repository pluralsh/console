import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  FetchPaginatedDataResult,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import {
  AiPinFragment,
  ChatThreadsQuery,
  ChatThreadTinyFragment,
  useChatThreadsQuery,
  useCreateAiPinMutation,
  useDeleteAiPinMutation,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { AIThreadsTableEntry } from './AIThreadsTableEntry.tsx'

export function AllThreadsTable() {
  const threadsQuery = useFetchPaginatedData({
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

  const filteredThreads = useMemo(
    () =>
      threadsQuery.data?.chatThreads?.edges
        ?.map((edge) => edge?.node)
        ?.filter((thread): thread is ChatThreadTinyFragment =>
          Boolean(thread)
        ) ?? [],
    [threadsQuery.data?.chatThreads?.edges]
  )

  return (
    <AIThreadsTable
      filteredThreads={filteredThreads}
      threadsQuery={threadsQuery}
      modal
    />
  )
}

export function AIThreadsTable({
  filteredThreads,
  threadsQuery,
  modal,
}: {
  filteredThreads: ChatThreadTinyFragment[]
  threadsQuery: FetchPaginatedDataResult<ChatThreadsQuery>
  modal?: boolean | null
}) {
  const theme = useTheme()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    threadsQuery
  const reactTableOptions = { meta: { modal } }

  if (error) return <GqlError error={error} />
  if (!data?.chatThreads?.edges)
    return (
      <TableSkeleton
        numColumns={1}
        centered={true}
        styles={{
          background: theme.colors['fill-one'],
          height: '100%',
          padding: theme.spacing.medium,

          '> svg': {
            width: '100%',
          },
        }}
      />
    )

  return (
    <FullHeightTableWrap
      css={{
        '& > div': {
          height: '100%',
        },
      }}
    >
      <Table
        virtualizeRows
        padCells={false}
        data={filteredThreads}
        columns={threadTableColumns}
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactTableOptions={reactTableOptions}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        css={{
          height: '100%',
          overflowX: 'hidden',
          border: theme.borders['fill-one'],
        }}
        emptyStateProps={{
          message: 'No chat threads found.',
        }}
      />
    </FullHeightTableWrap>
  )
}

const threadColumnHelper = createColumnHelper<ChatThreadTinyFragment>()
const pinColumnHelper = createColumnHelper<AiPinFragment>()

// putting the whole row into a single column, easier to customize
const ThreadRow = threadColumnHelper.accessor((thread) => thread, {
  id: 'thread',
  cell: function Cell({ getValue, table }) {
    const thread = getValue()
    const [pinThread, { loading }] = useCreateAiPinMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['AIPins', 'ChatThreads'],
      variables: {
        attributes: {
          threadId: thread.id,
          insightId: thread.insight?.id,
          name: thread.summary.substring(0, 250),
        },
      },
    })
    return (
      <AIThreadsTableEntry
        item={thread}
        onClickPin={() => pinThread()}
        pinLoading={loading}
        modal={table.options.meta?.modal || false}
      />
    )
  },
})

const PinRow = pinColumnHelper.accessor((pin) => pin, {
  id: 'pin',
  cell: function Cell({ getValue }) {
    const pin = getValue()
    const [unpinThread, { loading }] = useDeleteAiPinMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['AIPins', 'ChatThreads'],
      variables: {
        id: pin.id,
      },
    })
    return (
      <AIThreadsTableEntry
        item={pin}
        onClickPin={() => unpinThread()}
        pinLoading={loading}
      />
    )
  },
})

export const threadTableColumns = [ThreadRow]
export const pinTableColumns = [PinRow]
