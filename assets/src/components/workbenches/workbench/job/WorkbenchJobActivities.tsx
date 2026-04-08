import { Accordion, Card, Markdown } from '@pluralsh/design-system'
import {
  useWorkbenchJobActivitiesQuery,
  useWorkbenchJobActivityDeltaSubscription,
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useMemo, useState } from 'react'

import { useApolloClient } from '@apollo/client'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { VirtualList } from 'components/utils/VirtualList'
import styled from 'styled-components'
import {
  appendConnectionToEnd,
  mapExistingNodes,
  updateCache,
} from 'utils/graphql'
import { WorkbenchJobActivity } from './WorkbenchJobActivity'

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
  const lastId = lastActivityId(activities)

  const [openIds, setOpenIds] = useState<Set<string>>(new Set<string>())

  const allOpenIds = useMemo(() => {
    const allIds = new Set<string>(
      activities
        .filter(
          (a) =>
            a.status === WorkbenchJobActivityStatus.Pending ||
            a.status === WorkbenchJobActivityStatus.Running
        )
        .map((a) => a.id)
    ).union(openIds)

    if (lastId) allIds.add(lastId)

    return allIds
  }, [lastId, openIds, activities])

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
        values={allOpenIds}
        onValueChange={(values) => setOpenIds(new Set(values))}
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
              isOpen={allOpenIds.has(rowData.id)}
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
  background: theme.colors['fill-zero'],
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

const lastActivityId = (
  activities: WorkbenchJobActivityFragment[]
): string | null => {
  const last = activities.findLast(
    (a) => a.type !== WorkbenchJobActivityType.Memo
  )
  if (last) return last.id
  return null
}
