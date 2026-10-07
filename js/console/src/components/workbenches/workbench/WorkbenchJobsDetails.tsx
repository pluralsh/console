import {
  ArrowTopRightIcon,
  Chip,
  EmptyState,
  Flex,
  IconFrame,
  prettifyRepoUrl,
  PrIcon,
  PrMergedIcon,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  BoardLoadingOrEmpty,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsCollapseButton,
  DetailsColumnSC,
  DetailsExpandButton,
  DetailsLayoutSC,
  DetailsListAgeSC,
  DetailsListItem,
  DetailsListItemsSC,
  DetailsListSC,
  DetailsListSearchSC,
  DetailsPanelHeader,
  DetailsStatusGutter,
  DetailsTabBodySC,
  DetailsTabs,
  getJobGutterStatus,
  useDetailsSelection,
} from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import {
  PrStatus,
  PullRequestBasicFragment,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentProps, useMemo } from 'react'
import styled from 'styled-components'
import { formatShortAge, fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import {
  useSelectedJobTab,
  useWorkbenchJobTabsData,
  WorkbenchJobCommonTabContent,
  WorkbenchJobTabsData,
} from './job/WorkbenchJobPanel'
import { WorkbenchJobPrs } from './job/WorkbenchJobResult'
import { WorkbenchJobTriggerAlert } from './job/WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerIssue } from './job/WorkbenchJobTriggerIssue'
import { WorkbenchJobUsage } from './job/WorkbenchJobUsage'
import { WorkbenchJobConclusionPanel } from './WorkbenchJobConclusionPanel'
import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'

type DetailsTab =
  | 'Pull requests'
  | 'Ticket'
  | 'Alert'
  | 'Cost'
  | 'Eval'
  | 'Dashboard'
  | 'Topology'
  | 'Actions'

// Jobs details view: the job list (page sidebar) and the job panels.
export function useWorkbenchJobsDetails({
  workbenchId,
  jobs,
  loading,
  hasNextPage,
  fetchNextPage,
  searchString,
  onSearchChange,
}: {
  workbenchId: string
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  searchString: string
  onSearchChange: (value: string) => void
}) {
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })
  const { selected, setSelectedId, detailsOpen, setDetailsOpen } =
    useDetailsSelection(jobs)

  const sidebar = (
    <DetailsListSC>
      <DetailsListSearchSC>
        <WorkbenchSearchInput
          size="small"
          value={searchString}
          onChange={onSearchChange}
          placeholder="Search jobs"
        />
      </DetailsListSearchSC>
      <DetailsListItemsSC>
        {isEmpty(jobs) ? (
          <BoardLoadingOrEmpty
            loading={loading}
            message={
              searchString ? 'No matching jobs found.' : 'No jobs found.'
            }
          />
        ) : (
          jobs.map((job) => (
            <DetailsListItem
              key={job.id}
              selected={job.id === selected?.id}
              onSelect={() => setSelectedId(job.id)}
              gutter={
                <DetailsStatusGutter status={getJobGutterStatus(job.status)} />
              }
              title={
                <WorkbenchStoredPromptMarkdown
                  text={job.prompt ?? ''}
                  density="listItem"
                  clampLines={1}
                />
              }
              subtitle={job.user?.name}
              end={
                <>
                  <JobPrIcon job={job} />
                  <DetailsListAgeSC>
                    {formatShortAge(job.insertedAt)}
                  </DetailsListAgeSC>
                </>
              }
            />
          ))
        )}
        {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
      </DetailsListItemsSC>
    </DetailsListSC>
  )

  const content = (
    <DetailsLayoutSC $panelCount={detailsOpen ? 2 : 1}>
      {selected && (
        <WorkbenchJobConclusionPanel
          key={`conclusion-${selected.id}`}
          jobId={selected.id}
          jobStatus={selected.status}
          workbenchId={selected.workbench?.id ?? workbenchId}
          headerActions={
            !detailsOpen && (
              <DetailsExpandButton
                label="Show job details"
                onClick={() => setDetailsOpen(true)}
              />
            )
          }
        />
      )}
      {selected && detailsOpen && (
        <WorkbenchJobDetailsPanel
          key={`details-${selected.id}`}
          jobId={selected.id}
          onCollapse={() => setDetailsOpen(false)}
        />
      )}
    </DetailsLayoutSC>
  )

  return { sidebar, content }
}

function JobPrIcon({ job }: { job: WorkbenchJobTinyFragment }) {
  const prs = job.pullRequests?.filter(isNonNullable) ?? []
  if (isEmpty(prs)) return null
  const merged = prs.some(({ status }) => status === PrStatus.Merged)

  return (
    <IconFrame
      type="tertiary"
      size="medium"
      textValue={merged ? 'Merged pull request' : 'Pull request'}
      icon={merged ? <PrMergedIcon /> : <PrIcon />}
    />
  )
}

function WorkbenchJobDetailsPanel({
  jobId,
  onCollapse,
}: {
  jobId: string
  onCollapse: () => void
}) {
  // the job page's activity stream isn't mounted here, so poll for draft PRs
  const data = useWorkbenchJobTabsData(jobId, { pollActivities: true })
  const { job, isLoading } = data
  const tabs = useMemo(() => getDetailsTabs(data), [data])
  const [selectedTab, setSelectedTab] = useSelectedJobTab<DetailsTab>(
    tabs,
    'Pull requests'
  )

  return (
    <DetailsColumnSC>
      <DetailsPanelHeader title="Job details">
        {job?.updatedAt && (
          <UpdatedAtSC>updated {fromNow(job.updatedAt)}</UpdatedAtSC>
        )}
        <DetailsCollapseButton
          label="Hide job details"
          onClick={onCollapse}
        />
      </DetailsPanelHeader>
      {isLoading ? (
        <DetailsTabBodySC>
          <RectangleSkeleton
            $height={160}
            $width="100%"
          />
        </DetailsTabBodySC>
      ) : isEmpty(tabs) ? (
        <DetailsTabBodySC>
          <EmptyState message="No job details available yet." />
        </DetailsTabBodySC>
      ) : (
        <>
          <DetailsTabs
            tabs={tabs.map(({ label }) => label)}
            selected={selectedTab}
            onChange={setSelectedTab}
          />
          <DetailsTabBodySC>
            <WorkbenchJobDetailsTabContent
              tab={selectedTab}
              data={data}
            />
          </DetailsTabBodySC>
        </>
      )}
    </DetailsColumnSC>
  )
}

function WorkbenchJobDetailsTabContent({
  tab,
  data: { job, generatedPrs, draftPrs },
}: {
  tab: DetailsTab
  data: WorkbenchJobTabsData
}) {
  if (!job?.id) return null

  switch (tab) {
    case 'Pull requests':
      return (
        <Flex
          direction="column"
          gap="xlarge"
        >
          {!isEmpty(generatedPrs) && (
            <PrListSC>
              {generatedPrs.map((pr) => (
                <PrRow
                  key={pr.id}
                  pr={pr}
                />
              ))}
            </PrListSC>
          )}
          {!isEmpty(draftPrs) && (
            <WorkbenchJobPrs
              generatedPrs={[]}
              draftPrs={draftPrs}
              workbenchId={job.workbench?.id ?? ''}
              workbenchName={job.workbench?.name ?? ''}
              jobId={job.id}
            />
          )}
        </Flex>
      )
    case 'Ticket':
      return <WorkbenchJobTriggerIssue issue={job.issue} />
    case 'Alert':
      return <WorkbenchJobTriggerAlert alert={job.alert} />
    case 'Cost':
      return job.usage ? <WorkbenchJobUsage usage={job.usage} /> : null
    default:
      return (
        <WorkbenchJobCommonTabContent
          tab={tab}
          job={job}
        />
      )
  }
}

function PrRow({ pr }: { pr: PullRequestBasicFragment }) {
  return (
    <PrRowSC
      href={pr.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <StackedText
        truncate
        first={prettifyRepoUrl(pr.url, true)}
        firstPartialType="body2"
        firstColor="text"
        second={pr.title}
        css={{ flex: 1 }}
      />
      {pr.status && (
        <Chip
          size="small"
          fillLevel={1}
          severity={PR_STATUS_SEVERITY[pr.status]}
        >
          {PR_STATUS_LABEL[pr.status]}
        </Chip>
      )}
      <ArrowTopRightIcon
        size={12}
        color="icon-light"
        css={{ flexShrink: 0 }}
      />
    </PrRowSC>
  )
}

const PR_STATUS_SEVERITY: Record<
  PrStatus,
  ComponentProps<typeof Chip>['severity']
> = {
  [PrStatus.Open]: 'neutral',
  [PrStatus.Merged]: 'success',
  [PrStatus.Closed]: 'danger',
}

const PR_STATUS_LABEL: Record<PrStatus, string> = {
  [PrStatus.Open]: 'Open',
  [PrStatus.Merged]: 'Merged',
  [PrStatus.Closed]: 'Closed',
}

function getDetailsTabs({
  job,
  generatedPrs,
  draftPrs,
  hasActions,
}: WorkbenchJobTabsData): { label: DetailsTab }[] {
  return (
    [
      (!isEmpty(generatedPrs) || !isEmpty(draftPrs)) && 'Pull requests',
      !!job?.issue && 'Ticket',
      !!job?.alert && 'Alert',
      !!job?.usage && 'Cost',
      !!job?.evalResult && 'Eval',
      !isEmpty(job?.result?.canvas) && 'Dashboard',
      !!job?.result?.topology && 'Topology',
      hasActions && 'Actions',
    ] as const
  )
    .filter((label): label is DetailsTab => !!label)
    .map((label) => ({ label }))
}

const UpdatedAtSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  letterSpacing: 0,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

const PrListSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
})

const PrRowSC = styled.a(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: 10,
  borderRadius: theme.borderRadiuses.medium,
  textDecoration: 'none',
  '&:hover': { backgroundColor: theme.colors['fill-zero-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))
