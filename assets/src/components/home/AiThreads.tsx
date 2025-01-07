import { HOME_CARD_CONTENT_HEIGHT, HomeCard } from './HomeCard.tsx'
import { AiSparkleOutlineIcon, ChatOutlineIcon } from '@pluralsh/design-system'
import { AITable } from '../ai/AITable.tsx'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import {
  ChatThreadTinyFragment,
  useChatThreadsQuery,
} from '../../generated/graphql.ts'
import { useMemo } from 'react'
import { sortThreadsOrPins } from '../ai/AITableEntry.tsx'
import { AI_ABS_PATH } from '../../routes/aiRoutes.tsx'
import { isEmpty } from 'lodash'
import { AIEmptyState } from '../ai/AI.tsx'

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
      {!isEmpty(threads) && !threadsQuery.loading ? (
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
      ) : (
        <AIEmptyState
          icon={
            <ChatOutlineIcon
              color="icon-primary"
              size={24}
            />
          }
          message="No threads or insights"
          description="Insights will be automatically created and appear here when potential fixes are found."
          cssProps={{ backgroundColor: 'transparent', border: 'none' }}
        />
      )}
    </HomeCard>
  )
}
