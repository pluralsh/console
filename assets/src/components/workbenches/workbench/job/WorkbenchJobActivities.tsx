import { Accordion, Flex } from '@pluralsh/design-system'
import {
  useWorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useMemo, useState } from 'react'

import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { AILoadingText } from 'components/utils/AILoadingText'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { VirtualList } from 'components/utils/VirtualList'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { useWorkbenchJobStreams } from './useWorkbenchJobStreams'
import { isJobRunning, WorkbenchJobActivity } from './WorkbenchJobActivity'
import { ExpandableUserPrompt } from './WorkbenchJobActivityResults'
import { WorkbenchJobPromptInput } from './WorkbenchJobPromptInput'

export const ACTIVITY_GAP = 'medium' as const

export function WorkbenchJobActivities({ jobId }: { jobId: string }) {
  const { spacing } = useTheme()

  const { data, loading, error } = useWorkbenchJobActivitiesQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  })

  const job = data?.workbenchJob
  const activities = mapExistingNodes(job?.activities)

  const [closedIds, setClosedIds] = useState<Set<string> | null>(null)
  if (closedIds === null && !!data) setClosedIds(defaultClosedIds(activities))

  const openIds = useMemo(
    () => activities.filter((a) => !closedIds?.has(a.id)).map((a) => a.id),
    [activities, closedIds]
  )

  const textStreamMap = useWorkbenchJobStreams(jobId, setClosedIds)

  const userPromptIndices = useMemo(() => {
    const indices = [0] // 0 is initial user prompt in topContent
    activities.forEach((a, i) => {
      if (a.type === WorkbenchJobActivityType.User) indices.push(i + 1)
    })
    return indices
  }, [activities])

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
          onValueChange={(newOpenIds: string[]) => {
            setClosedIds(
              new Set(
                activities
                  .filter((a) => !newOpenIds.includes(a.id))
                  .map((a) => a.id)
              )
            )
          }}
        >
          <VirtualList
            isReversed
            data={activities}
            style={{
              padding: `${spacing.xlarge}px ${spacing.large}px ${spacing.medium}px`,
            }}
            keepMounted={userPromptIndices}
            topContent={
              <ExpandableUserPrompt
                prompt={job?.prompt}
                css={{ width: '100%', marginTop: 0 }}
              />
            }
            bottomContent={
              <>
                {textStreamMap['none'] && (
                  <SimplifiedMarkdown text={textStreamMap['none']} />
                )}
                {isJobRunning(job?.status) &&
                  activities.every(({ status }) =>
                    isActivityTerminal(status)
                  ) && (
                    <AILoadingText
                      jobId={jobId}
                      marginTop={spacing.small}
                    />
                  )}
              </>
            }
            renderer={({ rowData }) => (
              <WorkbenchJobActivity
                isOpen={
                  openIds.includes(rowData.id) ||
                  rowData.type === WorkbenchJobActivityType.Conclusion ||
                  rowData.type === WorkbenchJobActivityType.User
                }
                activity={rowData}
                jobId={jobId}
                textStream={textStreamMap[rowData.id] ?? ''}
              />
            )}
          />
        </ActivitiesAccordionSC>
      </ActivitiesPanelSC>
      <WorkbenchJobPromptInput job={job} />
    </Flex>
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
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-zero'],
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
}))

const lastActivityId = (
  activities: WorkbenchJobActivityFragment[]
): string | null => {
  const last = activities.findLast(
    (a) => a.type !== WorkbenchJobActivityType.Memo
  )
  if (last) return last.id
  return null
}

const defaultClosedIds = (
  activities: WorkbenchJobActivityFragment[]
): Set<string> => {
  const lastId = lastActivityId(activities)

  return new Set(
    activities
      .filter((a) => a.id !== lastId && isActivityTerminal(a.status))
      .map((a) => a.id)
  )
}

export const isActivityTerminal = (
  status: Nullable<WorkbenchJobActivityStatus>
) =>
  status === WorkbenchJobActivityStatus.Successful ||
  status === WorkbenchJobActivityStatus.Failed
