import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import { useWorkbenchJobsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { BoardCardGridSC } from 'components/workbenches/common/WorkbenchBoard'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchJobCard } from './WorkbenchJobCard'

export const LAUNCH_RECENT_JOBS_COUNT = 3

export function WorkbenchLaunchRecentJobs({
  workbenchId,
}: {
  workbenchId: string
}) {
  const { data, loading, error } = useWorkbenchJobsQuery({
    variables: { id: workbenchId, first: LAUNCH_RECENT_JOBS_COUNT },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  if (error) return <GqlError error={error} />
  if (isEmpty(jobs) && !loading) return null

  return (
    <SectionSC>
      <Subtitle2H1>Recent jobs</Subtitle2H1>
      <BoardCardGridSC>
        {isEmpty(jobs)
          ? Array.from({ length: LAUNCH_RECENT_JOBS_COUNT }).map((_, i) => (
              <RectangleSkeleton
                key={i}
                $height={140}
                $width="100%"
              />
            ))
          : jobs.map((job) => (
              <WorkbenchJobCard
                key={job.id}
                job={job}
              />
            ))}
      </BoardCardGridSC>
    </SectionSC>
  )
}

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))
