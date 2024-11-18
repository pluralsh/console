import { HomeCard } from './HomeCard.tsx'
import { AiSparkleOutlineIcon } from '@pluralsh/design-system'
import { AITable } from '../ai/AITable.tsx'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import {
  ChatThreadTinyFragment,
  useChatThreadsQuery,
} from '../../generated/graphql.ts'
import { useMemo } from 'react'
import { sortThreadsOrPins } from '../ai/AITableEntry.tsx'

export function AiThreads() {
  const threadsQuery = useFetchPaginatedData({
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

  const threads = useMemo(
    () =>
      threadsQuery.data?.chatThreads?.edges
        ?.map((edge) => edge?.node)
        ?.sort(sortThreadsOrPins)
        ?.filter((thread): thread is ChatThreadTinyFragment =>
          Boolean(thread)
        ) ?? [],
    [threadsQuery.data?.chatThreads?.edges]
  )

  return (
    <HomeCard
      title="Most recent AI threads"
      icon={<AiSparkleOutlineIcon />}
      noPadding
    >
      <AITable
        query={threadsQuery}
        rowData={threads}
        css={{
          border: 'none',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          width: '100%',
        }}
      />
    </HomeCard>
  )
}
