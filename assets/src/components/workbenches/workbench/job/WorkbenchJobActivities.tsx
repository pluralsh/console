import { Card, EmptyState, Markdown } from '@pluralsh/design-system'
import { StepperAccordionSC } from 'components/utils/StepperAccordion'
import {
  useWorkbenchJobActivitiesSuspenseQuery,
  useWorkbenchJobActivityDeltaSubscription,
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivitiesQuery,
} from 'generated/graphql'
import { useState } from 'react'

import { useApolloClient } from '@apollo/client'
import { VirtualList } from 'components/utils/VirtualList'
import styled from 'styled-components'
import {
  appendConnectionToEnd,
  mapExistingNodes,
  updateCache,
} from 'utils/graphql'
import { isActivityRunning, WorkbenchJobActivity } from './WorkbenchJobActivity'
import { AI_GRADIENT_BG } from 'components/ai/agent-runs/details/AIAgentRunMessages'

export const ACTIVITY_GAP = 'medium' as const

export function WorkbenchJobActivities({ jobId }: { jobId: string }) {
  const client = useApolloClient()

  const { data } = useWorkbenchJobActivitiesSuspenseQuery({
    variables: { id: jobId },
  })
  const job = data?.workbenchJob
  const activities = mapExistingNodes(job?.activities)

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

  const hasActivities = !!activities.length

  const [openIds, setOpenIds] = useState<string[]>(() =>
    activities
      .filter((activity) => !isActivityRunning(activity.status))
      .map((activity) => activity.id)
  )
  return (
    <ActivitiesPanelSC>
      {!hasActivities ? (
        <EmptyState message="No activities have started yet." />
      ) : (
        <StepperAccordionSC
          type="multiple"
          $gap={ACTIVITY_GAP}
          value={openIds}
          onValueChange={setOpenIds}
          css={{ height: '100%' }}
        >
          <VirtualList
            data={activities}
            itemGap={ACTIVITY_GAP}
            topContent={
              <JobPromptCardSC>
                <Markdown text={job?.prompt ?? ''} />
              </JobPromptCardSC>
            }
            renderer={({ rowData, index }) => (
              <WorkbenchJobActivity
                activity={rowData}
                progress={[]} // TODO
                isLast={index === activities.length - 1}
              />
            )}
          />
        </StepperAccordionSC>
      )}
    </ActivitiesPanelSC>
  )
}

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
}))
