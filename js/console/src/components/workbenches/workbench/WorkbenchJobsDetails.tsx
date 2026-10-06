import {
  ArrowTopRightIcon,
  Chip,
  EmptyState,
  Flex,
  HamburgerMenuCollapsedIcon,
  HamburgerMenuCollapseIcon,
  IconFrame,
  Input,
  prettifyRepoUrl,
  PrIcon,
  PrMergedIcon,
  SearchIcon,
  Spinner,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsColumnSC,
  DetailsErrorBanner,
  DetailsGutterStatus,
  DetailsLayoutSC,
  DetailsLinkSC,
  DetailsListItem,
  DetailsListItemsSC,
  DetailsListSC,
  DetailsListSearchSC,
  DetailsPanelBodySC,
  DetailsPanelHeader,
  DetailsStatusGutter,
} from 'components/workbenches/common/WorkbenchDetailsView'
import {
  PrStatus,
  PullRequestBasicFragment,
  useWorkbenchJobQuery,
  useWorkbenchJobSearchQuery,
  WorkbenchJobStatus,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import {
  ComponentProps,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatShortAge, fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { isJobRunning } from './job/WorkbenchJobActivity'
import { WorkbenchJobMeta } from './job/WorkbenchJobMeta'
import {
  useSelectedJobTab,
  useWorkbenchJobTabsData,
  WorkbenchJobCommonTabContent,
  WorkbenchJobTabsData,
} from './job/WorkbenchJobPanel'
import { WorkbenchJobPrs, WorkbenchJobResult } from './job/WorkbenchJobResult'
import { WorkbenchJobTriggerAlert } from './job/WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerIssue } from './job/WorkbenchJobTriggerIssue'
import { WorkbenchJobUsage } from './job/WorkbenchJobUsage'
import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'

const SEARCH_LIMIT = 50
const PROMPT_CLAMP_LINES = 4
const UNCLAMPED_LINES = 999

type JobListItem = Pick<
  WorkbenchJobTinyFragment,
  'id' | 'prompt' | 'status' | 'insertedAt' | 'user'
> & {
  workbench?: Nullable<{ id: string }>
  pullRequests?: Nullable<Nullable<Pick<PullRequestBasicFragment, 'status'>>[]>
}

type DetailsTab =
  | 'Pull requests'
  | 'Ticket'
  | 'Alert'
  | 'Cost'
  | 'Eval'
  | 'Dashboard'
  | 'Topology'
  | 'Actions'

export function WorkbenchJobsDetails({
  workbenchId,
  jobs,
  loading,
  hasNextPage,
  fetchNextPage,
}: {
  workbenchId: string
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const [selectedId, setSelectedId] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [query, setQuery] = useState('')
  const trimmedQuery = useDebounce(query, 200).trim()
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })

  const {
    data: searchData,
    loading: searchLoading,
    error: searchError,
  } = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: trimmedQuery, limit: SEARCH_LIMIT },
    skip: !trimmedQuery,
    fetchPolicy: 'network-only',
  })
  const searching = !!trimmedQuery
  const items: JobListItem[] = useMemo(
    () =>
      searching
        ? (searchData?.workbenchJobSearch ?? []).filter(isNonNullable)
        : jobs,
    [jobs, searchData, searching]
  )
  const selected = items.find(({ id }) => id === selectedId) ?? items[0]

  if (isEmpty(jobs) && !searching) {
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
        <DetailsListSearchSC>
          <Input
            size="small"
            showClearButton
            startIcon={<SearchIcon />}
            placeholder="Search jobs"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </DetailsListSearchSC>
        <DetailsListItemsSC>
          {searchError ? (
            <GqlError error={searchError} />
          ) : searching && searchLoading && !searchData ? (
            <CenteredSC css={{ padding: 16 }}>
              <Spinner />
            </CenteredSC>
          ) : searching && isEmpty(items) ? (
            <EmptyState message="No matching jobs found." />
          ) : (
            items.map((job) => (
              <DetailsListItem
                key={job.id}
                selected={job.id === selected?.id}
                onSelect={() => setSelectedId(job.id)}
                gutter={
                  <DetailsStatusGutter status={getJobGutterStatus(job)} />
                }
                title={
                  <WorkbenchStoredPromptMarkdown
                    text={job.prompt ?? ''}
                    density="jobCard"
                    clampLines={1}
                  />
                }
                subtitle={job.user?.name}
                end={
                  <>
                    <JobPrIcon job={job} />
                    {formatShortAge(job.insertedAt)}
                  </>
                }
              />
            ))
          )}
          {!searching && hasNextPage && (
            <LoadMoreSentinel onVisible={loadMore} />
          )}
        </DetailsListItemsSC>
      </DetailsListSC>
      {selected && (
        <WorkbenchJobConclusionPanel
          key={`conclusion-${selected.id}`}
          item={selected}
          workbenchId={workbenchId}
          detailsOpen={detailsOpen}
          onOpenDetails={() => setDetailsOpen(true)}
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
}

function JobPrIcon({ job }: { job: JobListItem }) {
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

function WorkbenchJobConclusionPanel({
  item,
  workbenchId,
  detailsOpen,
  onOpenDetails,
}: {
  item: JobListItem
  workbenchId: string
  detailsOpen: boolean
  onOpenDetails: () => void
}) {
  const { data, loading, error } = useWorkbenchJobQuery({
    variables: { id: item.id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const job = data?.workbenchJob
  const status = job?.status ?? item.status
  const jobPath = getWorkbenchJobAbsPath({
    workbenchId: item.workbench?.id ?? workbenchId,
    jobId: item.id,
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
        {!detailsOpen && (
          <IconFrame
            clickable
            type="tertiary"
            size="large"
            textValue="Show job details"
            tooltip="Show job details"
            icon={<HamburgerMenuCollapseIcon />}
            onClick={onOpenDetails}
          />
        )}
      </DetailsPanelHeader>
      <DetailsPanelBodySC>
        {status === WorkbenchJobStatus.Failed && (
          <DetailsErrorBanner action={viewJobLink}>
            Workbench job reported an error.
            {job?.error ? ` ${job.error}` : ''}
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
                <WorkbenchJobMeta
                  stacked
                  job={job}
                />
                <ExpandablePrompt prompt={job.prompt ?? ''} />
              </Flex>
              <WorkbenchJobResult
                job={job}
                loading={false}
                showAlertAndIssue={false}
                scrollable={false}
              />
            </>
          )
        )}
      </DetailsPanelBodySC>
    </DetailsColumnSC>
  )
}

function ExpandablePrompt({ prompt }: { prompt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    if (expanded) return
    const clamped = ref.current?.querySelector(':scope > div > div')
    setOverflowing(!!clamped && clamped.scrollHeight > clamped.clientHeight + 1)
  }, [expanded, prompt])

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <div ref={ref}>
        <WorkbenchStoredPromptMarkdown
          text={prompt}
          density="jobCard"
          clampLines={expanded ? UNCLAMPED_LINES : PROMPT_CLAMP_LINES}
          promptColor="text-xlight"
        />
      </div>
      {(overflowing || expanded) && (
        <ReadMoreSC
          type="button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Read less' : 'Read more'}
        </ReadMoreSC>
      )}
    </Flex>
  )
}

function WorkbenchJobDetailsPanel({
  jobId,
  onCollapse,
}: {
  jobId: string
  onCollapse: () => void
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const data = useWorkbenchJobTabsData(jobId)
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
        <IconFrame
          clickable
          type="tertiary"
          size="large"
          textValue="Hide job details"
          tooltip="Hide job details"
          icon={<HamburgerMenuCollapsedIcon />}
          onClick={onCollapse}
        />
      </DetailsPanelHeader>
      {isLoading ? (
        <TabBodySC>
          <RectangleSkeleton
            $height={160}
            $width="100%"
          />
        </TabBodySC>
      ) : isEmpty(tabs) ? (
        <TabBodySC>
          <EmptyState message="No job details available yet." />
        </TabBodySC>
      ) : (
        <>
          <Flex
            flexShrink={0}
            css={{ backgroundColor: theme.colors['fill-one'] }}
          >
            <TabList
              scrollable
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: selectedTab,
                onSelectionChange: (key) =>
                  setSelectedTab(String(key) as DetailsTab),
              }}
              flexShrink={0}
            >
              {tabs.map(({ label }) => (
                <Tab
                  key={label}
                  textValue={label}
                >
                  {label}
                </Tab>
              ))}
            </TabList>
            <Flex
              flex={1}
              css={{ borderBottom: theme.borders.default }}
            />
          </Flex>
          <TabBodySC>
            <WorkbenchJobDetailsTabContent
              tab={selectedTab}
              data={data}
            />
          </TabBodySC>
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
      <PrRowTextSC>
        <PrRowTitleSC>{prettifyRepoUrl(pr.url, true)}</PrRowTitleSC>
        {pr.title && <PrRowSubtitleSC>{pr.title}</PrRowSubtitleSC>}
      </PrRowTextSC>
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

function getJobGutterStatus({ status }: JobListItem): DetailsGutterStatus {
  if (status === WorkbenchJobStatus.Failed) return 'failed'
  if (isJobRunning(status)) return 'running'
  return null
}

const JobTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: 0,
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

const UpdatedAtSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  letterSpacing: 0,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

const TabBodySC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing.medium,
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

const PrRowTextSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
})

const PrRowTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const PrRowSubtitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const CenteredSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})
