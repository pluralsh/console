import {
  ChatFilledIcon,
  ChatOutlineIcon,
  Chip,
  Flex,
  IconFrame,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  FetchPaginatedDataResult,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  AiInsightSummaryFragment,
  AiPinFragment,
  ChatThreadsQuery,
  ChatThreadTinyFragment,
  useChatThreadsQuery,
  useCreateAiPinMutation,
  useDeleteAiPinMutation,
} from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from './AIContext'
import { AiThreadsTableActions } from './AiThreadsTableActions'

dayjs.extend(relativeTime)

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
      refetch={threadsQuery.refetch}
      modal
    />
  )
}

export function AIThreadsTable({
  filteredThreads,
  threadsQuery,
  refetch,
  modal,
}: {
  filteredThreads: ChatThreadTinyFragment[]
  threadsQuery: FetchPaginatedDataResult<ChatThreadsQuery>
  refetch: () => void
  modal?: boolean | null
}) {
  const theme = useTheme()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    threadsQuery
  const reactTableOptions = { meta: { refetch, modal } }

  if (error) return <GqlError error={error} />
  if (!data?.chatThreads?.edges)
    return (
      <TableSkeleton
        styles={{ background: theme.colors['fill-one'], height: '100%' }}
      />
    )

  return (
    <FullHeightTableWrap>
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
    const [pinThread, { loading: pinLoading }] = useCreateAiPinMutation({
      variables: {
        attributes: {
          threadId: thread.id,
          insightId: thread.insight?.id,
          name: thread.summary.substring(0, 250),
        },
      },
      onCompleted: () => table.options.meta?.refetch?.(),
    })
    return (
      <AITableRowBase
        item={thread}
        onClickPin={() => pinThread()}
        pinLoading={pinLoading}
        modal={table.options.meta?.modal || false}
      />
    )
  },
})

const PinRow = pinColumnHelper.accessor((pin) => pin, {
  id: 'pin',
  cell: function Cell({ getValue, table }) {
    const pin = getValue()
    const [unpinThread, { loading: unpinLoading }] = useDeleteAiPinMutation({
      variables: {
        id: pin.id,
      },
      onCompleted: () => table.options.meta?.refetch?.(),
    })
    return (
      <AITableRowBase
        item={pin}
        onClickPin={() => unpinThread()}
        pinLoading={unpinLoading}
      />
    )
  },
})

function AITableRowBase({
  item,
  onClickPin,
  pinLoading,
  modal,
}: {
  item: ChatThreadTinyFragment | AiPinFragment
  onClickPin?: () => void
  pinLoading?: boolean
  modal?: boolean | null
}) {
  const theme = useTheme()
  const { goToThread } = useChatbot()
  const isPin = item.__typename === 'AiPin'
  const thread = isPin
    ? (item as AiPinFragment).thread
    : (item as ChatThreadTinyFragment)
  if (!thread) return <div>handle insight pins</div>

  const isStale = dayjs().isAfter(dayjs(thread.updatedAt).add(24, 'hours'))

  return (
    <ThreadEntrySC onClick={() => goToThread(thread)}>
      <Flex
        gap="small"
        flex={1}
      >
        <IconFrame
          type="floating"
          icon={
            isStale ? (
              <ChatOutlineIcon color={theme.colors['icon-light']} />
            ) : (
              <ChatFilledIcon color={theme.colors['icon-info']} />
            )
          }
        />
        <StackedText
          css={{ maxWidth: '450px', color: theme.colors['text'] }}
          truncate
          first={thread.summary}
          second={getInsightResourceName(thread.insight)}
          firstPartialType="body1Bold"
        />
      </Flex>
      <CaptionP css={{ opacity: isStale ? 0.6 : 1 }}>
        {dayjs(
          thread.lastMessageAt || thread.updatedAt || thread.insertedAt
        ).fromNow()}
      </CaptionP>
      {!modal && (
        <>
          <Chip severity={isStale ? 'neutral' : 'success'}>
            {isStale ? 'Stale' : 'Active'}
          </Chip>
          <IconFrame
            clickable
            onClick={(e) => {
              e.stopPropagation()
              if (pinLoading) return
              onClickPin?.()
            }}
            icon={
              pinLoading ? (
                <Spinner />
              ) : isPin ? (
                <PushPinFilledIcon color={theme.colors['icon-info']} />
              ) : (
                <PushPinOutlineIcon />
              )
            }
          />
        </>
      )}
      <AiThreadsTableActions thread={thread} />
    </ThreadEntrySC>
  )
}

const ThreadEntrySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xlarge,
  height: '100%',
  width: '100%',
  background: theme.colors['fill-one'],
  padding: theme.spacing.medium,
  '&:not(:has(button:hover))': {
    '&:hover': {
      background: theme.colors['fill-two-selected'],
      cursor: 'pointer',
    },
  },
}))

export const getInsightResourceName = (
  insight: Nullable<AiInsightSummaryFragment>
): Nullable<string> =>
  insight?.cluster?.name ||
  insight?.clusterInsightComponent?.name ||
  insight?.service?.name ||
  insight?.serviceComponent?.name ||
  insight?.stack?.name ||
  insight?.stackRun?.message

export const threadTableColumns = [ThreadRow]
export const pinTableColumns = [PinRow]
