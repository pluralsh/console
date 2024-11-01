import {
  ChatFilledIcon,
  ChatOutlineIcon,
  Chip,
  Flex,
  IconFrame,
  PushPinOutlineIcon,
  Spinner,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { StackedText } from 'components/utils/table/StackedText'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  AiInsightSummaryFragment,
  ChatThreadFragment,
  ChatThreadTinyFragment,
  useChatThreadsQuery,
  useCreateAiPinMutation,
} from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from './AIContext'
import { AiThreadsTableActions } from './AiThreadsTableActions'

dayjs.extend(relativeTime)

export function AIThreadsTable() {
  const theme = useTheme()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useChatThreadsQuery,
      keyPath: ['chatThreads'],
    })

  const threads = useMemo(
    () =>
      data?.chatThreads?.edges
        ?.map((edge) => edge?.node)
        ?.filter((thread): thread is ChatThreadFragment => Boolean(thread)) ??
      [],
    [data?.chatThreads?.edges]
  )

  if (error) return <GqlError error={error} />
  if (!data?.chatThreads?.edges) return <LoadingIndicator />

  return (
    <FullHeightTableWrap>
      <Table
        virtualizeRows
        padCells={false}
        data={threads}
        columns={tableColumn}
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
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

const columnHelper = createColumnHelper<ChatThreadTinyFragment>()

// putting the whole row into a single column, easier to customize
const ColEntry = columnHelper.accessor((thread) => thread, {
  id: 'thread',
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const thread = getValue()
    const { goToThread } = useChatbot()
    const isStale = dayjs().isAfter(dayjs(thread.updatedAt).add(24, 'hours'))
    const [pinThread, { loading: pinLoading }] = useCreateAiPinMutation({
      variables: {
        attributes: {
          threadId: thread.id,
          insightId: thread.insight?.id,
          name: thread.summary,
        },
      },
    })
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
          Last updated {dayjs(thread.updatedAt).fromNow()}
        </CaptionP>
        <Chip severity={isStale ? 'neutral' : 'success'}>
          {isStale ? 'Stale' : 'Active'}
        </Chip>
        <IconFrame
          clickable
          onClick={(e) => {
            e.stopPropagation()
            pinThread()
          }}
          icon={pinLoading ? <Spinner /> : <PushPinOutlineIcon />}
        />
        <AiThreadsTableActions thread={thread} />
      </ThreadEntrySC>
    )
  },
})

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

const tableColumn = [ColEntry]
