import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
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
  AiInsight,
  AiInsightSummaryFragment,
  AiPinFragment,
  ChatThread,
  ChatThreadsQuery,
  ChatThreadTinyFragment,
  useChatThreadsQuery,
  useCreateAiPinMutation,
  useDeleteAiPinMutation,
} from 'generated/graphql'
import { Dispatch, ReactNode, useMemo } from 'react'
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
        styles={{ background: theme.colors['fill-one'], height: '100%' }}
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
      <AITableRowBase
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
      <AITableRowBase
        item={pin}
        onClickPin={() => unpinThread()}
        pinLoading={loading}
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
  const isPin = item.__typename === 'AiPin'
  const thread = isPin
    ? (item as AiPinFragment).thread
    : (item as ChatThreadTinyFragment)
  const insight = isPin ? (item as AiPinFragment).insight : undefined

  return thread ? (
    <ThreadEntry
      thread={thread}
      modal={modal}
      isPin={isPin}
      pinLoading={pinLoading}
      onClickPin={onClickPin}
      actions={<AiThreadsTableActions thread={thread} />}
    />
  ) : (
    <InsightEntry
      insight={insight}
      modal={modal}
      isPin={isPin}
      pinLoading={pinLoading}
      onClickPin={onClickPin}
    ></InsightEntry>
  )
}

const TableEntrySC = styled.div(({ theme }) => ({
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

function TableEntry({
  onClick,
  icon,
  title,
  subtitle,
  timestamp,
  stale,
  onClickPin,
  pinLoading,
  pinned,
  modal,
  actions,
}: {
  onClick: Dispatch<void>
  icon: ReactNode
  title: string
  subtitle?: string
  timestamp?: string
  stale?: boolean
  onClickPin?: Dispatch<void>
  pinLoading?: boolean
  pinned?: boolean
  actions?: ReactNode
  modal?: boolean
}): ReactNode {
  const theme = useTheme()

  return (
    <TableEntrySC onClick={onClick}>
      <Flex
        gap="small"
        flex={1}
      >
        <IconFrame
          type="floating"
          icon={icon}
        />
        <StackedText
          css={{ maxWidth: '450px', color: theme.colors['text'] }}
          truncate
          first={title}
          second={subtitle}
          firstPartialType="body1Bold"
        />
      </Flex>
      <CaptionP css={{ opacity: stale ? 0.6 : 1 }}>
        {dayjs(timestamp).fromNow()}
      </CaptionP>
      {!modal && (
        <>
          <Chip severity={stale ? 'neutral' : 'success'}>
            {stale ? 'Stale' : 'Active'}
          </Chip>
          <IconFrame
            clickable
            onClick={(e) => {
              e.stopPropagation()
              onClickPin?.()
            }}
            icon={
              pinLoading ? (
                <Spinner />
              ) : pinned ? (
                <PushPinFilledIcon color={theme.colors['icon-info']} />
              ) : (
                <PushPinOutlineIcon />
              )
            }
          />
        </>
      )}
      {actions}
    </TableEntrySC>
  )
}

function InsightEntry({
  insight,
  isPin,
  pinLoading,
  onClickPin,
  modal,
}: {
  insight: AiInsight
  modal: boolean
  isPin: boolean
  pinLoading?: boolean
  onClickPin?: Dispatch<void>
}): ReactNode {
  const theme = useTheme()
  const timestamp = insight.updatedAt || insight.insertedAt
  const isStale = dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))
  const icon = isStale ? (
    <AiSparkleOutlineIcon color={theme.colors['icon-light']} />
  ) : (
    <AiSparkleFilledIcon color={theme.colors['icon-info']} />
  )

  return (
    <TableEntry
      onClick={() => {}}
      icon={icon}
      title={insight.summary?.substring(0, 250)}
      subtitle={getInsightResourceName(insight)}
      timestamp={timestamp}
      pinned={isPin}
      pinLoading={pinLoading}
      onClickPin={() => {
        if (pinLoading) return
        onClickPin?.()
      }}
      stale={isStale}
      modal={modal}
    ></TableEntry>
  )
}

function ThreadEntry({
  thread,
  isPin,
  pinLoading,
  onClickPin,
  modal,
  actions,
}: {
  thread: ChatThread
  modal: boolean
  actions: ReadNode
  isPin: boolean
  pinLoading?: boolean
  onClickPin?: Dispatch<void>
}): ReactNode {
  const theme = useTheme()
  const timestamp =
    thread.lastMessageAt || thread.updatedAt || thread.insertedAt
  const isStale = dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))
  const icon = isStale ? (
    <ChatOutlineIcon color={theme.colors['icon-light']} />
  ) : (
    <ChatFilledIcon color={theme.colors['icon-info']} />
  )

  return (
    <TableEntry
      onClick={() => {}}
      icon={icon}
      title={thread.summary}
      subtitle={getInsightResourceName(thread.insight)}
      timestamp={timestamp}
      pinned={isPin}
      pinLoading={pinLoading}
      onClickPin={() => {
        if (pinLoading) return
        onClickPin?.()
      }}
      stale={isStale}
      modal={modal}
      actions={actions}
    ></TableEntry>
  )
}

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
