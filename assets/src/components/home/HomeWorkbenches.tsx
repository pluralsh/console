import {
  Breadcrumb,
  Card,
  CaretRightIcon,
  Flex,
  useSetBreadcrumbs,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useLogin } from 'components/contexts'
import usePersistedState from 'components/hooks/usePersistedState'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { TRUNCATE } from 'components/utils/truncate'
import {
  Body2P,
  CaptionP,
  Subtitle2H1,
  Title2H1,
} from 'components/utils/typography/Text'
import { WorkbenchCard } from 'components/workbenches/WorkbenchesList'
import { WorkbenchJobCreateInput } from 'components/workbenches/workbench/WorkbenchJobCreateInput'
import {
  useRecentWorkbenchJobsQuery,
  useWorkbenchesQuery,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]
const RECENT_JOBS_COUNT = 3
const WORKBENCH_ID_KEY = 'home-workbench-id'

export function HomeWorkbenches() {
  useSetBreadcrumbs(breadcrumbs)
  const { me } = useLogin()
  const [workbenchId, setWorkbenchId] = usePersistedState<Nullable<string>>(
    WORKBENCH_ID_KEY,
    null
  )

  return (
    <Flex
      justify="center"
      height="100%"
      overflow="auto"
    >
      <ContentWrapperSC>
        <HeadingSC>
          <WorkbenchIcon size={20} />
          <Title2H1>
            What can I do for you today {me?.name?.split(' ')[0]}?
          </Title2H1>
        </HeadingSC>
        <WorkbenchJobCreateInput
          workbenchId={workbenchId}
          setWorkbenchId={setWorkbenchId}
          workbenchLoading={false}
        />
        <RecentJobsSection />
        <YourWorkbenchesSection />
        <BottomSpacerSC />
      </ContentWrapperSC>
    </Flex>
  )
}

function RecentJobsSection() {
  const { data, loading, error } = useRecentWorkbenchJobsQuery({
    variables: { count: RECENT_JOBS_COUNT },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const jobs = useMemo(
    () => data?.recentWorkbenchJobs?.filter(isNonNullable) ?? [],
    [data]
  )

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
                $height={120}
                $width="100%"
              />
            ))
          : jobs.map((job) => (
              <RecentJobCard
                key={job.id}
                job={job}
              />
            ))}
      </CardGridSC>
    </SectionSC>
  )
}

function RecentJobCard({ job }: { job: WorkbenchJobTinyFragment }) {
  const { id, prompt, status, insertedAt, workbench } = job
  if (!workbench) return null

  return (
    <RecentJobCardSC
      clickable
      forwardedAs={Link}
      to={getWorkbenchJobAbsPath({ workbenchId: workbench.id, jobId: id })}
    >
      <StretchedFlex>
        <RunStatusIcon
          fullColor
          status={status}
        />
        <CaptionP $color="text-xlight">{fromNow(insertedAt)}</CaptionP>
      </StretchedFlex>
      <Body2P css={TRUNCATE}>{prompt}</Body2P>
      <CaptionP
        $color="text-xlight"
        css={{ maxWidth: '80%' }}
      >
        {workbench.name}
      </CaptionP>
      <CardArrowSC>
        <CaretRightIcon color="icon-xlight" />
      </CardArrowSC>
    </RecentJobCardSC>
  )
}

function YourWorkbenchesSection() {
  const { data, loading, error } = useWorkbenchesQuery({
    fetchPolicy: 'cache-and-network',
  })
  const workbenches = useMemo(
    () => mapExistingNodes(data?.workbenches).slice(0, 3),
    [data]
  )

  if (error) return <GqlError error={error} />
  if (isEmpty(workbenches) && !loading) return null

  return (
    <SectionSC>
      <Subtitle2H1>Your workbenches</Subtitle2H1>
      <CardGridSC>
        {isEmpty(workbenches)
          ? Array.from({ length: 3 }).map((_, i) => (
              <RectangleSkeleton
                key={i}
                $height={140}
                $width="100%"
              />
            ))
          : workbenches.map((workbench) => (
              <WorkbenchCard
                key={workbench.id}
                workbench={workbench}
              />
            ))}
      </CardGridSC>
    </SectionSC>
  )
}

const ContentWrapperSC = styled.div(({ theme }) => ({
  width: '100%',
  maxWidth: 924,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
  padding: `${theme.spacing.xxlarge}px ${theme.spacing.large}px 0`,
}))

const BottomSpacerSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  height: theme.spacing.large,
}))

const HeadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  paddingTop: theme.spacing.xxxlarge,
  [`@media (max-width: 1500px)`]: { paddingTop: theme.spacing.small },
}))

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
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  paddingRight: `calc(${theme.spacing.medium} + 16px)`,
  textDecoration: 'none',
  minHeight: 120,
}))

const CardArrowSC = styled.div(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing.medium,
  bottom: theme.spacing.medium,
  lineHeight: 0,
}))
