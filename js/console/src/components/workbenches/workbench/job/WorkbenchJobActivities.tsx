import { Accordion, Flex } from '@pluralsh/design-system'
import {
  useWorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useMemo, useState } from 'react'

import {
  hoverCaretAccordionCss,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { VirtualList } from 'components/utils/VirtualList'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { useWorkbenchJobStreams } from './useWorkbenchJobStreams'
import {
  isJobRunning,
  WorkbenchJobActivity,
  WorkbenchJobJobLevelThinking,
  WorkbenchJobMemoGroup,
} from './WorkbenchJobActivity'
import { WorkbenchJobEvalPromptCard } from './WorkbenchJobEvalPromptCard'
import { ExpandableUserPrompt } from './WorkbenchJobActivityResults'
import { WorkbenchJobPromptInput } from './WorkbenchJobPromptInput'
import { isActivityTerminal } from './workbenchJobActivityCollapse'

/** 24px between rows. Each title's 4px padding makes the total gap 32px. */
export const ACTIVITY_GAP = 'large' as const

export function WorkbenchJobActivities({
  jobId,
  workbenchId,
  workbenchName,
}: {
  jobId: string
  workbenchId: string
  workbenchName: string
}) {
  const { spacing } = useTheme()

  const { data, loading, error } = useWorkbenchJobActivitiesQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 15_000,
  })

  const job = data?.workbenchJob
  const activities = useMemo(
    () => mapExistingNodes(job?.activities),
    [job?.activities]
  )
  const activityGroups = useMemo(
    () => groupConsecutiveMemos(activities),
    [activities]
  )

  const [openIds, setOpenIds] = useState<string[]>([])

  const { textStreamMap, latestThoughtMap, jobLevelThinking } =
    useWorkbenchJobStreams(jobId, !!data)

  const userPromptIndices = useMemo(() => {
    const indices = [0] // 0 is initial user prompt in topContent
    activityGroups.forEach(({ activities }, i) => {
      if (activities[0]?.type === WorkbenchJobActivityType.User)
        indices.push(i + 1)
    })
    return indices
  }, [activityGroups])

  const noneStream = textStreamMap['none'] ?? ''
  const showBottomLoader =
    isJobRunning(job?.status) &&
    activities.every(({ status }) => isActivityTerminal(status)) &&
    jobLevelThinking.length === 0
  // Keep this element stable. A new one on each render re-pins the list to
  // the end, so an accordion opened at the bottom jumps upward.
  const bottomStatus =
    jobLevelThinking.length > 0
      ? 'thinking'
      : showBottomLoader
        ? 'planning'
        : null
  const bottomContent = useMemo(
    () => (
      <>
        {bottomStatus && (
          <WorkbenchJobJobLevelThinking
            items={jobLevelThinking}
            jobRunning={isJobRunning(job?.status)}
            planning={bottomStatus === 'planning'}
            jobId={jobId}
          />
        )}
        {noneStream && (
          <SimplifiedMarkdown
            text={noneStream}
            tone="thought"
          />
        )}
        <ChatEndSpaceSC />
      </>
    ),
    [bottomStatus, job?.status, jobId, jobLevelThinking, noneStream]
  )

  if (!data && loading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="100%"
      />
    )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
    >
      <ActivitiesPanelSC>
        <ActivitiesAccordionSC
          type="multiple"
          value={openIds}
          onValueChange={setOpenIds}
        >
          <VirtualList
            isReversed
            data={activityGroups}
            itemGap={ACTIVITY_GAP}
            style={{
              padding: `${spacing.large}px ${spacing.large}px 0`,
              // Keep the clicked row from being pinned when it grows at the bottom.
              overflowAnchor: 'none',
            }}
            keepMounted={userPromptIndices}
            topContent={
              job?.referencedJob && job.prompt ? (
                <WorkbenchJobEvalPromptCard
                  prompt={job.prompt}
                  referencedJob={job.referencedJob}
                  css={{ width: '100%', marginTop: 0 }}
                />
              ) : (
                <ExpandableUserPrompt
                  prompt={job?.prompt}
                  timestamp={job?.insertedAt}
                  fullWidth
                  css={{ marginTop: 0 }}
                />
              )
            }
            bottomContent={bottomContent}
            renderer={({ rowData }) => {
              const [activity] = rowData.activities

              return activity.type === WorkbenchJobActivityType.Memo ? (
                <WorkbenchJobMemoGroup
                  activities={rowData.activities}
                  textStreamMap={textStreamMap}
                />
              ) : (
                <WorkbenchJobActivity
                  isOpen={
                    openIds.includes(activity.id) ||
                    activity.type === WorkbenchJobActivityType.Conclusion ||
                    activity.type === WorkbenchJobActivityType.User
                  }
                  activity={activity}
                  jobId={jobId}
                  workbenchId={workbenchId}
                  workbenchName={workbenchName}
                  textStream={textStreamMap[activity.id] ?? ''}
                  latestThought={latestThoughtMap[activity.id]}
                />
              )
            }}
          />
        </ActivitiesAccordionSC>
      </ActivitiesPanelSC>
      <WorkbenchJobPromptInput job={job} />
    </Flex>
  )
}

type WorkbenchJobActivityGroup = {
  id: string
  activities: WorkbenchJobActivityFragment[]
}

export function groupConsecutiveMemos(
  activities: WorkbenchJobActivityFragment[]
): WorkbenchJobActivityGroup[] {
  return activities.reduce<WorkbenchJobActivityGroup[]>((groups, activity) => {
    const lastGroup = groups.at(-1)
    const isMemo = activity.type === WorkbenchJobActivityType.Memo
    const followsMemo =
      lastGroup?.activities[0]?.type === WorkbenchJobActivityType.Memo

    if (isMemo && followsMemo) {
      lastGroup.activities.push(activity)

      return groups
    }

    groups.push({ id: activity.id, activities: [activity] })

    return groups
  }, [])
}

const ActivitiesAccordionSC = styled(Accordion)({
  border: 'none',
  background: 'none',
  height: '100%',
  ...hoverCaretAccordionCss,
})

/** Room under the last message so an accordion at the end opens downward. */
const ChatEndSpaceSC = styled.div(({ theme }) => ({
  height: theme.spacing.xxxxlarge,
  flexShrink: 0,
}))

const ActivitiesPanelSC = styled.div(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-zero'],
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
}))
