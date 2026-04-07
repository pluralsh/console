import { Accordion, Card, Markdown } from '@pluralsh/design-system'
import {
  useWorkbenchJobActivitiesQuery,
  useWorkbenchJobActivityDeltaSubscription,
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivitiesQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'

import { useApolloClient } from '@apollo/client'
import { AI_GRADIENT_BG } from 'components/ai/agent-runs/details/AIAgentRunMessages'
import { VirtualList } from 'components/utils/VirtualList'
import styled from 'styled-components'
import {
  appendConnectionToEnd,
  mapExistingNodes,
  updateCache,
} from 'utils/graphql'
import { WorkbenchJobActivity } from './WorkbenchJobActivity'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { GqlError } from 'components/utils/Alert'

export const ACTIVITY_GAP = 'medium' as const

export function WorkbenchJobActivities({ jobId }: { jobId: string }) {
  const client = useApolloClient()

  const { data, loading, error } = useWorkbenchJobActivitiesQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  })
  const job = data?.workbenchJob
  const activities = mapExistingNodes(job?.activities)

  // easier to track closed ids in state since we want them all open by default
  const [closedIds, setClosedIds] = useState<Set<string>>(() => new Set())
  const openIds = useMemo(
    () => activities.filter((a) => !closedIds.has(a.id)).map((a) => a.id),
    [activities, closedIds]
  )

  useWorkbenchJobActivityDeltaSubscription({
    variables: { jobId },
    onData: ({ data: { data } }) => {
      updateCache<WorkbenchJobActivitiesQuery>(client.cache, {
        query: WorkbenchJobActivitiesDocument,
        variables: { id: jobId },
        update: (prev) => ({
          ...prev,
          workbenchJob: appendConnectionToEnd(
            prev.workbenchJob,
            data?.workbenchJobActivityDelta?.payload,
            'activities'
          ),
        }),
      })
    },
  })

  if (!data && loading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="100%"
      />
    )

  if (error) return <GqlError error={error} />

  return (
    <ActivitiesPanelSC>
      <ActivitiesAccordionSC
        type="multiple"
        value={openIds}
        onValueChange={(newOpenIds: string[]) => {
          setClosedIds(
            new Set(
              activities
                .map((a) => a.id)
                .filter((id) => !newOpenIds.includes(id))
            )
          )
        }}
      >
        <VirtualList
          isReversed
          data={activities}
          topContent={
            <JobPromptCardSC>
              <Markdown text={job?.prompt ?? ''} />
            </JobPromptCardSC>
          }
          renderer={({ rowData }) => (
            <WorkbenchJobActivity
              isOpen={openIds.includes(rowData.id)}
              activity={rowData}
              progress={[]} // TODO
            />
          )}
        />
      </ActivitiesAccordionSC>
    </ActivitiesPanelSC>
  )
}

const ActivitiesAccordionSC = styled(Accordion)({
  border: 'none',
  background: 'none',
  height: '100%',
})

const ActivitiesPanelSC = styled.div(({ theme }) => ({
  position: 'relative',
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.xlarge}px ${theme.spacing.large}px`,
  background: AI_GRADIENT_BG,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  overflow: 'auto',
}))

const JobPromptCardSC = styled(Card)(({ theme }) => ({
  ...theme.partials.text.body2,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  wordBreak: 'break-word',
  marginBottom: theme.spacing.small,
}))
