import {
  CloseIcon,
  CostManagementIcon,
  DashboardIcon,
  GaugeIcon,
  GraphIcon,
  IconFrame,
  PaperCheckIcon,
  PrIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
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
import { WorkbenchJobCanvas } from './WorkbenchJobCanvas'
import {
  PATCH_PR_URL,
  WorkbenchJobDraftPr,
  WorkbenchJobEval,
  WorkbenchJobPrs,
  WorkbenchJobResult,
  WorkbenchJobTopology,
} from './WorkbenchJobResult'
import { WorkbenchJobUsage } from './WorkbenchJobUsage'

const SIDE_PANEL_TYPE: SidePanel = 'workbench-job'
type JobPanelTab =
  | 'Result'
  | 'Dashboard'
  | 'Topology'
  | 'Pull requests'
  | 'Eval'
  | 'Usage'

export function WorkbenchJobPanelContent() {
  const { spacing } = useTheme()
  const { pathname } = useLocation() // useParams won't work because the panel renders outside the workbench route tree
  const jobId =
    matchPath(WORKBENCH_JOB_ABS_PATH, pathname)?.params[
      WORKBENCH_JOBS_PARAM_JOB
    ] ?? ''
  const { setOpen } = useWorkbenchJobPanel()
  const tabStateRef = useRef<any>(null)
  const [selectedTab, setSelectedTab] = useState<JobPanelTab>('Result')

  // polling handled by WorkbenchJob.tsx which should also update the cache
  const { data, loading } = useWorkbenchJobQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
  })
  const { data: activitiesData } = useWorkbenchJobActivitiesQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-first',
  })
  const job = data?.workbenchJob
  const isLoading = loading && !job
  const activities = useMemo(
    () =>
      activitiesData?.workbenchJob?.activities?.edges
        ?.map((edge) => edge?.node)
        .filter(isNonNullable) ?? [],
    [activitiesData]
  )
  const pullRequests = job?.pullRequests?.filter(isNonNullable) ?? []
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
  const hasDraftPrsAwaitingApproval = draftPrs.length > 0

  const tabs = getPanelTabs(job, hasDraftPrsAwaitingApproval)

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
          {selectedTab === 'Result' && (
            <WorkbenchJobResult
              job={job}
              loading={isLoading}
            />
          )}
          {selectedTab === 'Dashboard' && job?.id && (
            <WorkbenchJobCanvas
              jobId={job.id}
              canvas={job?.result?.canvas}
            />
          )}
          {selectedTab === 'Topology' && (
            <WorkbenchJobTopology topology={job?.result?.topology ?? ''} />
          )}
          {selectedTab === 'Pull requests' && job?.id && (
            <WorkbenchJobPrs
              generatedPrs={generatedPrs}
              draftPrs={draftPrs}
              workbenchId={job.workbench?.id ?? ''}
              workbenchName={job.workbench?.name ?? ''}
              jobId={job.id}
            />
          )}
          {selectedTab === 'Eval' && job?.evalResult && (
            <WorkbenchJobEval job={job} />
          )}
          {selectedTab === 'Usage' && job?.usage && (
            <WorkbenchJobUsage usage={job?.usage} />
          )}
        </ContentInnerSC>
      </ContentWrapperSC>
    </SidePanelContent>
  )
}

export function useWorkbenchJobPanel(autoOpen?: Nullable<boolean>) {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const isOpen = sidePanel === SIDE_PANEL_TYPE
  const setOpen = (open: boolean) => setSidePanel(open ? SIDE_PANEL_TYPE : null)

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

const PanelSubTabSC = styled(SubTab)(({ theme, active }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  flexShrink: 0,
  minWidth: 'max-content',
  outline: active ? theme.borders.default : 'none',
  borderRadius: 20,
  background: active ? theme.colors['fill-one'] : 'transparent',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  '&:hover': { background: active ? undefined : theme.colors['fill-zero'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const getPanelTabs = (
  job: Nullable<WorkbenchJobFragment>,
  hasDraftPrsAwaitingApproval: boolean
) =>
  [
    { label: 'Result', icon: <PaperCheckIcon size={12} /> },
    !isEmpty(job?.result?.canvas) && {
      label: 'Dashboard',
      icon: <DashboardIcon size={12} />,
    },
    !!job?.result?.topology && {
      label: 'Topology',
      icon: <GraphIcon size={12} />,
    },
    (!isEmpty(job?.pullRequests) || hasDraftPrsAwaitingApproval) && {
      label: 'Pull requests',
      icon: <PrIcon size={12} />,
      showDot: hasDraftPrsAwaitingApproval,
    },
    job?.evalResult && {
      label: 'Eval',
      icon: <GaugeIcon size={12} />,
    },
    job?.usage && {
      label: 'Usage',
      icon: <CostManagementIcon size={12} />,
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
