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
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  BoardEmptyList,
  EmptyListState,
  LoadMoreSentinel,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsCaptionSC,
  DetailsPanelToggle,
  DetailsColumnSC,
  DetailsLayoutSC,
  DetailsLinkRowSC,
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
  useDetailsViewState,
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
import { ensureURLValidity } from 'utils/url'
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
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  searchString,
  onSearchChange,
  active,
  emptyState,
}: {
  workbenchId: string
  jobs: WorkbenchJobTinyFragment[]
  // first load only (spinner); later fetches don't blank the view
  loading: boolean
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  searchString: string
  onSearchChange: (value: string) => void
  // the details view is shown
  active: boolean
  emptyState: EmptyListState
}) {
  const { selected, setSelectedId, detailsOpen, setDetailsOpen } =
    useDetailsViewState(jobs)

  // the view isn't shown: skip building the list and panels for every item
  if (!active) return { sidebar: null, content: null }

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
          <BoardEmptyList
            noun="jobs"
            loading={loading}
            emptyState={emptyState}
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
              // plain text: rendered markdown links and resource chips
              // would navigate away from inside the row's button
              title={prettifyPrompt(job.prompt ?? '')}
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
        <LoadMoreSentinel
          fetchingMore={fetchingMore}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
        />
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
              <DetailsPanelToggle
                expand
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
  const data = useWorkbenchJobTabsData(jobId, { inDetailsView: true })
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
          <DetailsCaptionSC>updated {fromNow(job.updatedAt)}</DetailsCaptionSC>
        )}
        <DetailsPanelToggle
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
    <DetailsLinkRowSC
      href={ensureURLValidity(pr.url) || undefined}
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
    </DetailsLinkRowSC>
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

const PrListSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
})
