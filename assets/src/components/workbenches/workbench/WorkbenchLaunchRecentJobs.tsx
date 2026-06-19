import { Card, CaretRightIcon } from '@pluralsh/design-system'
import { WorkbenchJobCardStatus } from 'components/workbenches/common/WorkbenchJobCardStatus'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import {
  useWorkbenchJobsQuery,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchJobActionsRow } from './WorkbenchJobsTable'

const RECENT_JOBS_COUNT = 3

export function WorkbenchLaunchRecentJobs({
  workbenchId,
}: {
  workbenchId: string
}) {
  const { data, loading, error } = useWorkbenchJobsQuery({
    variables: { id: workbenchId, first: RECENT_JOBS_COUNT },
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
      <CardGridSC>
        {isEmpty(jobs)
          ? Array.from({ length: RECENT_JOBS_COUNT }).map((_, i) => (
              <RectangleSkeleton
                key={i}
                $height={140}
                $width="100%"
              />
            ))
          : jobs.map((job) => (
              <WorkbenchLaunchRecentJobCard
                key={job.id}
                job={job}
              />
            ))}
      </CardGridSC>
    </SectionSC>
  )
}

function WorkbenchLaunchRecentJobCard({
  job,
}: {
  job: WorkbenchJobTinyFragment
}) {
  const { id, prompt, insertedAt, user, workbench } = job
  if (!workbench) return null

  return (
    <RecentJobCardSC
      clickable
      forwardedAs={Link}
      to={getWorkbenchJobAbsPath({ workbenchId: workbench.id, jobId: id })}
    >
      <StretchedFlex>
        <WorkbenchJobCardStatus job={job} />
        <CaptionP $color="text-xlight">{fromNow(insertedAt)}</CaptionP>
      </StretchedFlex>
      <WorkbenchStoredPromptMarkdown
        text={prompt ?? ''}
        density="jobCard"
        clampLines={2}
      />
      <BottomSectionSC>
        {user && (
          <CaptionP
            $color="text-xlight"
            css={{ ...TRUNCATE_STYLE }}
          >
            {user.name}
          </CaptionP>
        )}
        <DividerSC />
        <CardActionsRowSC>
          <WorkbenchJobActionsRow
            job={job}
            chipFillLevel={2}
          />
          <CaretRightIcon
            color="icon-xlight"
            css={{ marginLeft: 'auto', flexShrink: 0 }}
          />
        </CardActionsRowSC>
      </BottomSectionSC>
    </RecentJobCardSC>
  )
}

const TRUNCATE_STYLE = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

const CardGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: theme.spacing.medium,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))

const RecentJobCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  minHeight: 140,
  '&&:has(button:hover, [data-clickable="true"]:hover):hover': {
    backgroundColor: theme.colors['fill-one'],
  },
}))

const BottomSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  marginTop: 'auto',
}))

// Fixed height matches the tallest possible child (IconFrame medium = 32px)
// so all action rows occupy the same layout height without clipping content.
const CardActionsRowSC = styled.div({
  height: 32,
  display: 'flex',
  alignItems: 'center',
})

const DividerSC = styled.div(({ theme }) => ({
  borderTop: `1px solid ${theme.colors['border-fill-one']}`,
  marginLeft: -theme.spacing.medium,
  marginRight: -theme.spacing.medium,
}))
