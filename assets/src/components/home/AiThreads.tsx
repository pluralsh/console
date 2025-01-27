import { HOME_CARD_CONTENT_HEIGHT, HomeCard } from './HomeCard.tsx'
import {
  AiSparkleOutlineIcon,
  ChatOutlineIcon,
  Spinner,
} from '@pluralsh/design-system'
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
import { useAIEnabled } from '../contexts/DeploymentSettingsContext.tsx'
import { useTheme } from 'styled-components'

export function AiThreads() {
  const theme = useTheme()
  const aiEnabled = useAIEnabled()

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
      {aiEnabled !== undefined ? (
        isEmpty(threads) && threadsQuery.data ? (
          <AIEmptyState
            icon={
              aiEnabled ? (
                <ChatOutlineIcon
                  color="icon-primary"
                  size={24}
                />
              ) : undefined
            }
            message={
              aiEnabled
                ? 'No threads or insights'
                : 'Plural AI features are disabled'
            }
            description={
              aiEnabled
                ? 'Insights will be automatically created and appear here when potential fixes are found.'
                : 'Leverage Plural’s unique real-time telemetry to automate diagnostics, receive precise fix recommendations, and keep your team informed with instant insights across all clusters.'
            }
            cssProps={{ backgroundColor: 'transparent', border: 'none' }}
          />
        ) : (
          <AITable
            query={threadsQuery}
            rowData={threads}
            hidePins
            hasNextPage={false} // Prevent from loading more items than on the first page.
            border="none"
            borderTopLeftRadius={0}
            borderTopRightRadius={0}
            maxHeight={HOME_CARD_CONTENT_HEIGHT}
          />
        )
      ) : (
        <div
          css={{
            display: 'flex',
            justifyContent: 'center',
            padding: theme.spacing.xlarge,
          }}
        >
          <Spinner size={24} />
        </div>
      )}
    </HomeCard>
  )
}
