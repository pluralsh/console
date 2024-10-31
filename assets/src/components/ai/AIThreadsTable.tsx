import { CaretRightIcon, Spinner, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Body1BoldP } from 'components/utils/typography/Text'
import { ChatThreadFragment, useChatThreadsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from './AIContext'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

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
          border: theme.borders['fill-one'],
          '& div': { border: 'none' },
        }}
        emptyStateProps={{
          message: 'No chat threads found.',
        }}
      />
    </FullHeightTableWrap>
  )
}

const columnHelper = createColumnHelper<ChatThreadFragment>()

// putting the whole row into a single column, easier to customize
const ColEntry = columnHelper.accessor((thread) => thread, {
  id: 'thread',
  cell: function Cell({ getValue }) {
    const thread = getValue()
    const { goToThread, loading } = useChatbot()
    return (
      <ThreadEntrySC onClick={() => goToThread(thread)}>
        <Body1BoldP
          $color="text"
          css={{ flex: 1 }}
        >
          {thread.summary}
        </Body1BoldP>
        {loading ? <Spinner /> : <CaretRightIcon />}
      </ThreadEntrySC>
    )
  },
})

const ThreadEntrySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  width: '100%',
  background: theme.colors['fill-one'],
  borderBottom: theme.borders['fill-two'],
  padding: theme.spacing.medium,
  '&:hover': {
    background: theme.colors['fill-two-selected'],
    cursor: 'pointer',
  },
}))

const tableColumn = [ColEntry]
