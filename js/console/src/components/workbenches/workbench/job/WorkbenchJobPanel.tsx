import {
  CloseIcon,
  CostManagementIcon,
  DashboardIcon,
  GaugeIcon,
  GraphIcon,
  IconFrame,
  LightningIcon,
  PaperCheckIcon,
  PrIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  PanelHeaderSC,
  SidePanelContent,
} from 'components/ai/chatbot/SidePanelShared'
import {
  SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import { TabLabelWithIndicatorDot } from 'components/workbenches/common/TabLabelWithIndicatorDot'
import {
  AgentRunStatus,
  PullRequestBasicFragment,
  useWorkbenchJobActivitiesQuery,
  useWorkbenchJobQuery,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { isEmpty, isNil, uniqBy } from 'lodash'
import {
  ReactElement,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import {
  WORKBENCH_JOB_ABS_PATH,
  WORKBENCH_JOBS_PARAM_JOB,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { isJobRunning } from './WorkbenchJobActivity'
import { WorkbenchJobActions } from './WorkbenchJobActions'
import { WorkbenchJobCanvas } from './WorkbenchJobCanvas'
import {
  PATCH_PR_URL,
  WorkbenchJobDraftPr,
  WorkbenchJobEval,
  WorkbenchJobPrs,
  WorkbenchJobResult,
  WorkbenchJobTopology,
} from './WorkbenchJobResult'
import { hasWorkbenchJobResultContent } from './workbenchJobResultUtils'
import { WorkbenchJobUsage } from './WorkbenchJobUsage'
import { useWorkbenchJobActionSummary } from './useWorkbenchJobActionSummary'

const SIDE_PANEL_TYPE: SidePanel = 'workbench-job'
type JobPanelTab =
  | 'Result'
  | 'Dashboard'
  | 'Topology'
  | 'Pull requests'
  | 'Eval'
  | 'Usage'
  | 'Actions'

export function WorkbenchJobPanelContent() {
  const { spacing } = useTheme()
  const { pathname } = useLocation() // useParams won't work because the panel renders outside the workbench route tree
  const jobId =
    matchPath(WORKBENCH_JOB_ABS_PATH, pathname)?.params[
      WORKBENCH_JOBS_PARAM_JOB
    ] ?? ''
  const { setOpen } = useWorkbenchJobPanel()
  const tabStateRef = useRef<any>(null)
  const data = useWorkbenchJobTabsData(jobId)
  const { job, isLoading, areActionsLoading } = data
  const tabs = useMemo(() => getPanelTabs(data), [data])
  const [selectedTab, setSelectedTab] = useSelectedJobTab(tabs, 'Result')

  useEffect(() => {
    if (isLoading || areActionsLoading) return
    if (job && isEmpty(tabs)) setOpen(false)
  }, [areActionsLoading, isLoading, job, setOpen, tabs])

  return (
    <SidePanelContent>
      <PanelHeaderSC>
        <TabListWrapperSC>
          <TabList
            scrollable
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: selectedTab,
              onSelectionChange: (key) =>
                setSelectedTab(String(key) as JobPanelTab),
            }}
            css={{ gap: spacing.small, width: '100%' }}
          >
            {tabs.map(({ label, icon, showDot }) => (
              <PanelSubTabSC
                key={label}
                textValue={label}
              >
                {icon}
                {label !== 'Result' ? (
                  showDot ? (
                    <TabLabelWithIndicatorDot showDot>
                      {label}
                    </TabLabelWithIndicatorDot>
                  ) : (
                    label
                  )
                ) : !isJobRunning(job?.status) && job?.result?.conclusion ? (
                  'Conclusion'
                ) : (
                  'Working theory'
                )}
              </PanelSubTabSC>
            ))}
          </TabList>
        </TabListWrapperSC>
        <IconFrame
          clickable
          css={{ flexShrink: 0 }}
          icon={<CloseIcon />}
          onClick={() => setOpen(false)}
          tooltip="Close panel"
        />
      </PanelHeaderSC>
      <ContentWrapperSC>
        <ContentInnerSC>
          {selectedTab === 'Result' &&
            (isLoading || hasWorkbenchJobResultContent(job)) && (
              <WorkbenchJobResult
                job={job}
                loading={isLoading}
              />
            )}
          {selectedTab === 'Pull requests' && job?.id && (
            <WorkbenchJobPrs
              generatedPrs={data.generatedPrs}
              draftPrs={data.draftPrs}
              workbenchId={job.workbench?.id ?? ''}
              workbenchName={job.workbench?.name ?? ''}
              jobId={job.id}
            />
          )}
          {selectedTab === 'Usage' && job?.usage && (
            <WorkbenchJobUsage usage={job.usage} />
          )}
          <WorkbenchJobCommonTabContent
            tab={selectedTab}
            job={job}
          />
        </ContentInnerSC>
      </ContentWrapperSC>
    </SidePanelContent>
  )
}

export type WorkbenchJobTabsData = ReturnType<typeof useWorkbenchJobTabsData>

// Job data behind the job tabs, shared by the job side panel and the Jobs tab
// details view. On the job page, polling is handled by the page itself (which
// keeps the cache up to date). The details view passes `inDetailsView`: its
// conclusion panel already fetches and polls the job, so the job is read from
// the cache, and activities (draft PRs) and actions are polled only while the
// job runs.
export function useWorkbenchJobTabsData(
  jobId: string,
  { inDetailsView = false }: { inDetailsView?: boolean } = {}
) {
  const { data, loading } = useWorkbenchJobQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: inDetailsView ? 'cache-first' : 'cache-and-network',
  })
  const job = data?.workbenchJob
  const isLoading = loading && !job
  const running = isJobRunning(job?.status)
  const {
    data: activitiesData,
    startPolling,
    stopPolling,
  } = useWorkbenchJobActivitiesQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: inDetailsView ? 'cache-and-network' : 'cache-first',
  })
  const {
    hasActions,
    hasActionsAwaitingApproval,
    isLoading: areActionsLoading,
  } = useWorkbenchJobActionSummary(jobId, { poll: !inDetailsView || running })
  const pollingActivities = inDetailsView && running

  useEffect(() => {
    if (!pollingActivities) return
    startPolling(POLL_INTERVAL)
    return () => stopPolling()
  }, [pollingActivities, startPolling, stopPolling])

  const activities = useMemo(
    () =>
      activitiesData?.workbenchJob?.activities?.edges
        ?.map((edge) => edge?.node)
        .filter(isNonNullable) ?? [],
    [activitiesData]
  )
  const pullRequests = useMemo(
    () => job?.pullRequests?.filter(isNonNullable) ?? [],
    [job?.pullRequests]
  )
  const generatedPrs = useMemo(
    () =>
      pullRequests.filter(
        (pr): pr is PullRequestBasicFragment =>
          isNonNullable(pr) && pr.url !== PATCH_PR_URL
      ),
    [pullRequests]
  )
  const draftPrs = useMemo((): WorkbenchJobDraftPr[] => {
    const agentRuns = uniqBy(
      activities
        .flatMap((activity) =>
          [activity.agentRun, ...(activity.agentRuns ?? [])].filter(
            isNonNullable
          )
        )
        .filter(isNonNullable),
      'id'
    ).filter(
      (run) =>
        run.status === AgentRunStatus.PendingApproval &&
        !run.approvedAt &&
        !!run.upload?.patch
    )

    const agentRunDrafts: WorkbenchJobDraftPr[] = agentRuns.map((agentRun) => ({
      type: 'agentRun',
      agentRun,
    }))

    const linkedPrIds = new Set(
      agentRuns.flatMap(
        (run) =>
          run.pullRequests?.map((pr) => pr?.id).filter(isNonNullable) ?? []
      )
    )

    const patchPrDrafts: WorkbenchJobDraftPr[] = pullRequests
      .filter(
        (pr): pr is PullRequestBasicFragment =>
          isNonNullable(pr) && pr.url === PATCH_PR_URL
      )
      .filter((pr) => !linkedPrIds.has(pr.id))
      .map((pullRequest) => ({ type: 'patchPr', pullRequest }))

    return [...agentRunDrafts, ...patchPrDrafts]
  }, [activities, pullRequests])

  return useMemo(
    () => ({
      job,
      isLoading,
      areActionsLoading,
      generatedPrs,
      draftPrs,
      hasActions,
      hasActionsAwaitingApproval,
    }),
    [
      areActionsLoading,
      draftPrs,
      generatedPrs,
      hasActions,
      hasActionsAwaitingApproval,
      isLoading,
      job,
    ]
  )
}

// Keeps the selection on an available tab as tabs appear and disappear.
export function useSelectedJobTab<T extends string>(
  tabs: { label: T }[],
  initial: T
) {
  const [selectedTab, setSelectedTab] = useState<T>(initial)

  useEffect(() => {
    if (tabs.some(({ label }) => label === selectedTab)) return

    if (tabs[0]) setSelectedTab(tabs[0].label)
  }, [selectedTab, tabs])

  return [selectedTab, setSelectedTab] as const
}

// Tab content that renders the same in the job side panel and the details view.
export function WorkbenchJobCommonTabContent({
  tab,
  job,
}: {
  tab: string
  job: Nullable<WorkbenchJobFragment>
}) {
  if (!job?.id) return null

  switch (tab) {
    case 'Dashboard':
      return (
        <WorkbenchJobCanvas
          jobId={job.id}
          canvas={job.result?.canvas}
        />
      )
    case 'Topology':
      return <WorkbenchJobTopology topology={job.result?.topology ?? ''} />
    case 'Eval':
      return job.evalResult ? <WorkbenchJobEval job={job} /> : null
    case 'Actions':
      return <WorkbenchJobActions jobId={job.id} />
    default:
      return null
  }
}

export function useWorkbenchJobPanel(autoOpen?: Nullable<boolean>) {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const isOpen = sidePanel === SIDE_PANEL_TYPE
  const setOpen = useCallback(
    (open: boolean) => setSidePanel(open ? SIDE_PANEL_TYPE : null),
    [setSidePanel]
  )

  const onAutoOpen = useEffectEvent(() => setOpen(true))
  const onUnmount = useEffectEvent(() => setOpen(false))
  useEffect(() => {
    if (!!autoOpen) onAutoOpen()
    return () => {
      if (!isNil(autoOpen)) onUnmount()
    }
  }, [autoOpen])

  return { isOpen, setOpen }
}

const ContentWrapperSC = styled.div(() => ({
  height: '100%',
  width: '100%',
  overflow: 'auto',
}))

const ContentInnerSC = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: '100%',
}))

const TabListWrapperSC = styled.div({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
})

const PanelSubTabSC = styled(SubTab)(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  flexShrink: 0,
  minWidth: 'max-content',
  outline: 'none',
  boxShadow: 'none',
  borderRadius: 20,
  backgroundColor: 'transparent',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  '&:hover': {
    backgroundColor: theme.colors['fill-zero-hover'],
  },
  '&[aria-selected="true"]': {
    color: theme.colors.text,
    backgroundColor:
      theme.mode === 'light'
        ? theme.colors.grey[50]
        : theme.colors['fill-one-selected'],
    boxShadow: `inset 0 0 0 ${theme.borderWidths.default}px ${theme.colors.border}`,
    '&:hover': {
      backgroundColor:
        theme.mode === 'light'
          ? theme.colors.grey[50]
          : theme.colors['fill-one-selected'],
    },
  },
}))

const getPanelTabs = ({
  job,
  isLoading,
  draftPrs,
  hasActions,
  hasActionsAwaitingApproval,
}: WorkbenchJobTabsData) =>
  [
    (isLoading || hasWorkbenchJobResultContent(job)) && {
      label: 'Result',
      icon: <PaperCheckIcon size={12} />,
    },
    !isEmpty(job?.result?.canvas) && {
      label: 'Dashboard',
      icon: <DashboardIcon size={12} />,
    },
    !!job?.result?.topology && {
      label: 'Topology',
      icon: <GraphIcon size={12} />,
    },
    (!isEmpty(job?.pullRequests) || !isEmpty(draftPrs)) && {
      label: 'Pull requests',
      icon: <PrIcon size={12} />,
      showDot: !isEmpty(draftPrs),
    },
    job?.evalResult && {
      label: 'Eval',
      icon: <GaugeIcon size={12} />,
    },
    job?.usage && {
      label: 'Usage',
      icon: <CostManagementIcon size={12} />,
    },
    hasActions && {
      label: 'Actions',
      icon: <LightningIcon size={12} />,
      showDot: hasActionsAwaitingApproval,
    },
  ].filter(
    (
      tab
    ): tab is {
      label: JobPanelTab
      icon: ReactElement
      showDot?: boolean
    } => Boolean(tab)
  )
