import { CaretRightIcon, Spinner, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Body1BoldP } from 'components/utils/typography/Text'
import { ChatThreadFragment, useChatThreadsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useLaunchChatbot } from '../AIContext'

export function ChatbotPanelThreadList() {
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
  if (!threads) return <LoadingIndicator />

  return (
    <FullHeightTableWrap css={{ paddingBottom: theme.spacing.medium }}>
      <Table
        virtualizeRows
        padCells={false}
        data={threads}
        columns={tableColumn}
        flush
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        css={{ height: '100%', '& *': { border: 'none' } }}
        emptyStateProps={{
          message: 'No chat threads found.',
        }}
      />
    </FullHeightTableWrap>
  )
}

const columnHelper = createColumnHelper<ChatThreadFragment>()
const ColThread = columnHelper.accessor((thread) => thread, {
  id: 'thread',
  cell: function Cell({ getValue }) {
    const thread = getValue()
    const { goToThread, loading } = useLaunchChatbot()
    return (
      <ThreadEntryWrapperSC>
        <ThreadEntrySC onClick={() => goToThread(thread)}>
          <Body1BoldP $color="text">{thread.summary}</Body1BoldP>
          {loading ? <Spinner /> : <CaretRightIcon />}
        </ThreadEntrySC>
      </ThreadEntryWrapperSC>
    )
  },
})

const ThreadEntryWrapperSC = styled.div(({ theme }) => ({
  height: '100%',
  padding: theme.spacing.medium,
  paddingBottom: 0,
  background: theme.colors['fill-one'],
}))

const ThreadEntrySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  background: theme.colors['fill-two'],
  borderBottom: theme.borders['fill-two'],
  padding: theme.spacing.medium,
  '&:hover': {
    background: theme.colors['fill-two-selected'],
    cursor: 'pointer',
  },
}))

const tableColumn = [ColThread]
