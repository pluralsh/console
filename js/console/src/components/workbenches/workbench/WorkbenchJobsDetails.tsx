import {
  EmptyState,
  Flex,
  IconFrame,
  MenuCollapseIcon,
  PrIcon,
  SidePanelOpenIcon,
  Spinner,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DetailsColumnSC,
  DetailsErrorBanner,
  DetailsGutterStatus,
  DetailsLayoutSC,
  DetailsLinkSC,
  DetailsListItem,
  DetailsListSC,
  DetailsPanelBodySC,
  DetailsPanelHeader,
  DetailsStatusGutter,
} from 'components/workbenches/common/WorkbenchDetailsView'
import {
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  useWorkbenchJobQuery,
  WorkbenchJobStatus,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatShortAge } from 'utils/datetime'
import { WorkbenchJobMeta } from './job/WorkbenchJobMeta'
import { isJobRunning } from './job/WorkbenchJobActivity'
import { JobPanelTab, WorkbenchJobTabs } from './job/WorkbenchJobPanel'
import { WorkbenchJobResult } from './job/WorkbenchJobResult'
import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'

// The conclusion has its own panel in this view.
const EXCLUDED_DETAIL_TABS: JobPanelTab[] = ['Result']

export function WorkbenchJobsDetails({
  jobs,
  loading,
  hasNextPage,
  fetchNextPage,
}: {
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const [selectedId, setSelectedId] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(true)
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })
  const selected = jobs.find(({ id }) => id === selectedId) ?? jobs[0]

  if (isEmpty(jobs)) {
    return loading ? (
      <CenteredSC>
        <Spinner />
      </CenteredSC>
    ) : (
      <EmptyState message="No jobs found." />
    )
  }

  return (
    <DetailsLayoutSC $panelCount={detailsOpen ? 2 : 1}>
      <DetailsListSC>
        {jobs.map((job) => (
          <DetailsListItem
            key={job.id}
            selected={job.id === selected?.id}
            onSelect={() => setSelectedId(job.id)}
            gutter={<DetailsStatusGutter status={getJobGutterStatus(job)} />}
            title={
              <WorkbenchStoredPromptMarkdown
                text={job.prompt ?? ''}
                density="tableCell"
                clampLines={1}
              />
            }
            subtitle={job.user?.name}
            end={
              <>
                {!isEmpty(job.pullRequests) && (
                  <IconFrame
                    size="medium"
                    icon={<PrIcon />}
                    tooltip="Has pull requests"
                  />
                )}
                {formatShortAge(job.insertedAt)}
              </>
            }
          />
        ))}
        {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
      </DetailsListSC>
      {selected && (
        <WorkbenchJobConclusionPanel
          key={selected.id}
          job={selected}
          showOpenDetails={!detailsOpen}
          onOpenDetails={() => setDetailsOpen(true)}
        />
      )}
      {selected && detailsOpen && (
        <DetailsColumnSC>
          <DetailsPanelHeader title="Job details">
            <IconFrame
              clickable
              size="small"
              icon={<MenuCollapseIcon css={{ transform: 'scaleY(-1)' }} />}
              tooltip="Hide job details"
              onClick={() => setDetailsOpen(false)}
            />
          </DetailsPanelHeader>
          <WorkbenchJobTabs
            key={selected.id}
            jobId={selected.id}
            excludedTabs={EXCLUDED_DETAIL_TABS}
          />
        </DetailsColumnSC>
      )}
    </DetailsLayoutSC>
  )
}

function WorkbenchJobConclusionPanel({
  job: jobTiny,
  showOpenDetails,
  onOpenDetails,
}: {
  job: WorkbenchJobTinyFragment
  showOpenDetails: boolean
  onOpenDetails: () => void
}) {
  const [promptExpanded, setPromptExpanded] = useState(false)
  const { data, loading, error } = useWorkbenchJobQuery({
    variables: { id: jobTiny.id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const job = data?.workbenchJob
  const jobPath = getWorkbenchJobAbsPath({
    workbenchId: jobTiny.workbench?.id ?? '',
    jobId: jobTiny.id,
  })
  const viewJobLink = (
    <DetailsLinkSC
      as={Link}
      to={jobPath}
    >
      View job
    </DetailsLinkSC>
  )

  return (
    <DetailsColumnSC>
      <DetailsPanelHeader title="Conclusion">
        {viewJobLink}
        {showOpenDetails && (
          <IconFrame
            clickable
            size="small"
            icon={<SidePanelOpenIcon />}
            tooltip="Show job details"
            onClick={onOpenDetails}
          />
        )}
      </DetailsPanelHeader>
      <DetailsPanelBodySC>
        {jobTiny.status === WorkbenchJobStatus.Failed && (
          <DetailsErrorBanner action={viewJobLink}>
            Workbench job reported an error.
            {jobTiny.error ? ` ${jobTiny.error}` : ''}
          </DetailsErrorBanner>
        )}
        {error && <GqlError error={error} />}
        {!job && loading ? (
          <RectangleSkeleton
            $height={320}
            $width="100%"
          />
        ) : (
          job && (
            <>
              <Flex
                direction="column"
                gap="medium"
              >
                <JobTitleSC>{job.workbench?.name}</JobTitleSC>
                <WorkbenchJobMeta job={job} />
                {promptExpanded ? (
                  <WorkbenchStoredPromptMarkdown text={job.prompt ?? ''} />
                ) : (
                  <WorkbenchStoredPromptMarkdown
                    text={job.prompt ?? ''}
                    density="jobCard"
                    clampLines={4}
                    promptColor="text-xlight"
                  />
                )}
                <ReadMoreSC
                  type="button"
                  onClick={() => setPromptExpanded(!promptExpanded)}
                >
                  {promptExpanded ? 'Read less' : 'Read more'}
                </ReadMoreSC>
              </Flex>
              <WorkbenchJobResult
                job={job}
                loading={false}
              />
            </>
          )
        )}
      </DetailsPanelBodySC>
    </DetailsColumnSC>
  )
}

function getJobGutterStatus({
  status,
}: WorkbenchJobTinyFragment): DetailsGutterStatus {
  if (status === WorkbenchJobStatus.Failed) return 'failed'
  if (isJobRunning(status)) return 'running'
  return null
}

const JobTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle2,
  margin: 0,
  paddingTop: theme.spacing.small,
  color: theme.colors.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const ReadMoreSC = styled.button(({ theme }) => ({
  all: 'unset',
  ...theme.partials.text.body2,
  alignSelf: 'flex-start',
  cursor: 'pointer',
  color: theme.colors['text-input-disabled'],
  '&:hover': { color: theme.colors['text-light'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const CenteredSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})
