import { Button } from '@pluralsh/design-system'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_JOBS_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { EmptyListState } from 'components/workbenches/common/WorkbenchBoard'
import { useWorkbenchJobStatusCountsQuery } from 'generated/graphql'
import { JOB_STATUS_OPTIONS } from './workbenchJobsDisplay'
import { WorkbenchJobsGroupedList } from './WorkbenchJobsGroupedList'

const LAUNCH_JOBS_PER_STATUS = 5
const LAUNCH_JOBS_WINDOW_DAYS = 7
const LAUNCH_DEFAULT_COLLAPSED = {}

const EMPTY_STATE: EmptyListState = {
  searching: false,
  filtered: false,
  onResetFilters: () => {},
}

export function WorkbenchLaunchRecentJobs({
  workbenchId,
}: {
  workbenchId: string
}) {
  // stable for the visit, so polling doesn't move the window every render
  const insertedAfter = useMemo(
    () => dayjs().subtract(LAUNCH_JOBS_WINDOW_DAYS, 'day').toISOString(),
    []
  )
  const filters = useMemo(() => ({ insertedAfter }), [insertedAfter])
  const { data, previousData, loading, error } =
    useWorkbenchJobStatusCountsQuery({
      // same variables as the list below, so both share one polled query
      variables: {
        id: workbenchId,
        q: undefined,
        prStates: undefined,
        insertedAfter,
      },
      skip: !workbenchId,
      fetchPolicy: 'cache-and-network',
      pollInterval: POLL_INTERVAL,
    })
  const countsData = data ?? previousData
  const hasJobs = (countsData?.workbench?.runCounts?.statuses ?? []).some(
    (entry) => (entry?.count ?? 0) > 0
  )

  if (error) return <GqlError error={error} />
  if (!hasJobs && !countsData && loading) {
    return (
      <SectionSC>
        <Subtitle2H1>Recent jobs</Subtitle2H1>
        <RectangleSkeleton
          $height={132}
          $width="100%"
        />
      </SectionSC>
    )
  }
  if (!hasJobs) return null

  return (
    <SectionSC>
      <HeaderSC>
        <TitleSC>
          <Subtitle2H1>Recent jobs</Subtitle2H1>
          <CaptionP $color="text-xlight">
            Last {LAUNCH_JOBS_WINDOW_DAYS} days
          </CaptionP>
        </TitleSC>
        <Button
          small
          secondary
          as={Link}
          to={`${getWorkbenchAbsPath(workbenchId)}/${WORKBENCH_JOBS_REL_PATH}`}
        >
          All jobs
        </Button>
      </HeaderSC>
      <WorkbenchJobsGroupedList
        workbenchId={workbenchId}
        statuses={JOB_STATUS_OPTIONS}
        filters={filters}
        emptyState={EMPTY_STATE}
        pageSize={LAUNCH_JOBS_PER_STATUS}
        capped
        fill={false}
        defaultCollapsed={LAUNCH_DEFAULT_COLLAPSED}
      />
    </SectionSC>
  )
}

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
}))

const TitleSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing.small,
}))
