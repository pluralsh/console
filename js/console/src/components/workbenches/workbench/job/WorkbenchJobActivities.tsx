import { Accordion, Flex } from '@pluralsh/design-system'
import {
  useWorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useMemo, useState } from 'react'

import { hoverCaretAccordionCss } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { VirtualList } from 'components/utils/VirtualList'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { usePollWhileRunning } from './usePollWhileRunning'
import { useWorkbenchJobStreams } from './useWorkbenchJobStreams'
import {
  isJobRunning,
  WorkbenchJobActivity,
  WorkbenchJobCodingAgentGroup,
  WorkbenchJobJobLevelThinking,
  WorkbenchJobMemoGroup,
} from './WorkbenchJobActivity'
import { WorkbenchJobEvalPromptCard } from './WorkbenchJobEvalPromptCard'
import { ExpandableUserPrompt } from './WorkbenchJobActivityResults'
import { WorkbenchJobPromptInput } from './WorkbenchJobPromptInput'
import {
  isActivityTerminal,
  isCodingAgentActivity,
} from './workbenchJobActivityCollapse'

/** The only space between top-level rows. Rows add no vertical padding of their own. */
export const ACTIVITY_GAP = 'small' as const

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

  const query = useWorkbenchJobActivitiesQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
  })
  const { data, loading, error } = query

  const job = data?.workbenchJob
  usePollWhileRunning(query, isJobRunning(job?.status))
  const activities = useMemo(
    () => mapExistingNodes(job?.activities),
    [job?.activities]
  )
  const activityGroups = useMemo(
    () => groupConsecutiveActivities(activities),
    [activities]
  )

  const [openIds, setOpenIds] = useState<string[]>([])

  const { latestThoughtMap, jobLevelThinking } = useWorkbenchJobStreams(
    jobId,
    !!data
  )

  const userPromptIndices = useMemo(() => {
    const indices = [0] // 0 is initial user prompt in topContent
    activityGroups.forEach(({ activities }, i) => {
      if (activities[0]?.type === WorkbenchJobActivityType.User)
        indices.push(i + 1)
    })
    return indices
  }, [activityGroups])

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
        <ChatEndSpaceSC />
      </>
    ),
    [bottomStatus, job?.status, jobId, jobLevelThinking]
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
              padding: `${spacing.large} ${spacing.large} 0`,
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
                  attachments={job?.attachments}
                  fullWidth
                  css={{ marginTop: 0 }}
                />
              )
            }
            bottomContent={bottomContent}
            renderer={({ rowData }) => {
              const [activity] = rowData.activities

              if (rowData.kind === 'memo')
                return <WorkbenchJobMemoGroup activities={rowData.activities} />
              if (rowData.kind === 'codingAgent')
                return (
                  <WorkbenchJobCodingAgentGroup
                    activities={rowData.activities}
                  />
                )

              return (
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

type WorkbenchJobActivityGroupKind = 'memo' | 'codingAgent' | 'single'

type WorkbenchJobActivityGroup = {
  id: string
  kind: WorkbenchJobActivityGroupKind
  activities: WorkbenchJobActivityFragment[]
}

function activityGroupKind(
  activity: WorkbenchJobActivityFragment
): WorkbenchJobActivityGroupKind {
  if (activity.type === WorkbenchJobActivityType.Memo) return 'memo'
  if (isCodingAgentActivity(activity)) return 'codingAgent'

  return 'single'
}

/** Folds consecutive memos, and consecutive coding agent runs, into a single row each. */
export function groupConsecutiveActivities(
  activities: WorkbenchJobActivityFragment[]
): WorkbenchJobActivityGroup[] {
  return activities.reduce<WorkbenchJobActivityGroup[]>((groups, activity) => {
    const lastGroup = groups.at(-1)
    const kind = activityGroupKind(activity)

    if (kind !== 'single' && lastGroup?.kind === kind) {
      lastGroup.activities.push(activity)

      return groups
    }

    groups.push({ id: activity.id, kind, activities: [activity] })

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
