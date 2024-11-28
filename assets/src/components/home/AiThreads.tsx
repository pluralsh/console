import { HOME_CARD_CONTENT_HEIGHT, HomeCard } from './HomeCard.tsx'
import { AiSparkleOutlineIcon } from '@pluralsh/design-system'
import { AITable } from '../ai/AITable.tsx'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import {
  ChatThreadTinyFragment,
  useChatThreadsQuery,
} from '../../generated/graphql.ts'
import { useMemo } from 'react'
import { sortThreadsOrPins } from '../ai/AITableEntry.tsx'
import { AI_ABS_PATH } from '../../routes/aiRoutes.tsx'

export function AiThreads() {
  const threadsQuery = useFetchPaginatedData(
    { queryHook: useChatThreadsQuery, keyPath: ['chatThreads'] },
    { first: 3 }
  )

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
      link={AI_ABS_PATH}
      noPadding
    >
      <AITable
        query={threadsQuery}
        rowData={threads}
        hidePins
        css={{
          border: 'none',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          maxHeight: HOME_CARD_CONTENT_HEIGHT,
        }}
        hasNextPage={false} // Prevent from loading more items than on the first page.
      />
    </HomeCard>
  )
}
