import {
  ArrowTopRightIcon,
  CloseIcon,
  FileDiffIcon,
  Flex,
  HourglassIcon,
  IconFrame,
  Markdown,
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
  useSidePanelWidth,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import {
  AgentRunFragment,
  AgentRunMode,
  AgentRunStatus,
  useAgentRunQuery,
} from 'generated/graphql'
import { isEmpty, isNil } from 'lodash'
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import {
  AI_AGENT_RUN_ABS_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
} from 'routes/aiRoutesConsts'
import { getPodDetailsPath } from 'routes/cdRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { AgentRunDiff } from './AgentRunDiff.tsx'
import { AgentRunPullRequests } from './AgentRunPullRequests.tsx'
import { AgentRunWorkingTheory } from './AgentRunWorkingTheory.tsx'
import { useAgentRunTodos } from './AIAgentRunSidecar.tsx'

const SIDE_PANEL_TYPE: SidePanel = 'agent-run'
export enum AgentRunPanelTab {
  Diff = 'Diff',
  Analysis = 'Analysis',
  WorkingTheory = 'Working theory',
  PullRequests = 'Pull requests',
}

export function shouldShowAgentRunSidePanel(
  run: Nullable<AgentRunFragment>,
  isLoading = false
) {
  if (isLoading) return true

  return !!run?.id
}

type AgentRunApprovalActions = {
  onApprove: () => void
  approving: boolean
}

type AgentRunPanelContextT = {
  isOpen: boolean
  selectedTab: AgentRunPanelTab
  setSelectedTab: (tab: AgentRunPanelTab) => void
  requestedTab: AgentRunPanelTab | null
  clearRequestedTab: () => void
  setOpen: (open: boolean, tab?: AgentRunPanelTab) => void
  approval: Nullable<AgentRunApprovalActions>
  setApproval: (approval: Nullable<AgentRunApprovalActions>) => void
}

const AgentRunPanelContext = createContext<AgentRunPanelContextT>({
  isOpen: false,
  selectedTab: AgentRunPanelTab.Analysis,
  setSelectedTab: () =>
    console.error('useAgentRunPanel must be used within AgentRunPanelProvider'),
  requestedTab: null,
  clearRequestedTab: () =>
    console.error('useAgentRunPanel must be used within AgentRunPanelProvider'),
  setOpen: () =>
    console.error('useAgentRunPanel must be used within AgentRunPanelProvider'),
  approval: null,
  setApproval: () =>
    console.error('useAgentRunPanel must be used within AgentRunPanelProvider'),
})

export function AgentRunPanelProvider({ children }: { children: ReactNode }) {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const [selectedTab, setSelectedTab] = useState<AgentRunPanelTab>(
    AgentRunPanelTab.Analysis
  )
  const [requestedTab, setRequestedTab] = useState<AgentRunPanelTab | null>(
    null
  )
  const [approval, setApproval] =
    useState<Nullable<AgentRunApprovalActions>>(null)
  const isOpen = sidePanel === SIDE_PANEL_TYPE

  const clearRequestedTab = useCallback(() => setRequestedTab(null), [])

  const setOpen = useCallback(
    (open: boolean, tab?: AgentRunPanelTab) => {
      if (open && tab) {
        setRequestedTab(tab)
        setSelectedTab(tab)
      }
      if (!open) setRequestedTab(null)
      setSidePanel(open ? SIDE_PANEL_TYPE : null)
    },
    [setSidePanel]
  )

  const ctx = useMemo(
    () => ({
      isOpen,
      selectedTab,
      setSelectedTab,
      requestedTab,
      clearRequestedTab,
      setOpen,
      approval,
      setApproval,
    }),
    [isOpen, selectedTab, requestedTab, clearRequestedTab, setOpen, approval]
  )

  return <AgentRunPanelContext value={ctx}>{children}</AgentRunPanelContext>
}

export function AgentRunPanelContent() {
  const { spacing } = useTheme()
  const { pathname } = useLocation()
  const runId =
    matchPath(AI_AGENT_RUN_ABS_PATH, pathname)?.params[
      AI_AGENT_RUNS_PARAM_RUN_ID
    ] ?? ''
  const {
    setOpen,
    selectedTab,
    setSelectedTab,
    requestedTab,
    clearRequestedTab,
    approval,
  } = useAgentRunPanel()
  const tabStateRef = useRef<any>(null)
  const [diffFullscreen, setDiffFullscreen] = useState(false)
  const isDiffMaximized =
    diffFullscreen && selectedTab === AgentRunPanelTab.Diff

  useEffect(() => {
    clearRequestedTab()
  }, [runId, clearRequestedTab])

  useEffect(() => {
    if (!runId) setDiffFullscreen(false)
  }, [runId])

  useEffect(() => {
    if (selectedTab !== AgentRunPanelTab.Diff) setDiffFullscreen(false)
  }, [selectedTab])

  const { data, loading } = useAgentRunQuery({
    skip: !runId,
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
  })
  const run = data?.agentRun
  const isLoading = loading && !run

  const pullRequests = useMemo(
    () =>
      (run?.pullRequests ?? []).filter(
        (pr): pr is NonNullable<typeof pr> =>
          isNonNullable(pr) && Boolean(pr.id && pr.url)
      ),
    [run?.pullRequests]
  )
  const hasPullRequests = !isEmpty(pullRequests)
  const isTerminalStatus =
    run?.status === AgentRunStatus.Successful ||
    run?.status === AgentRunStatus.Failed ||
    run?.status === AgentRunStatus.Cancelled
  const showAnalysisTab =
    !!run?.analysis &&
    (run.mode !== AgentRunMode.Write || (!hasPullRequests && isTerminalStatus))
  const showDiffTab = !!run?.upload?.patch
  const isDiffTabShowingPatch =
    selectedTab === AgentRunPanelTab.Diff && showDiffTab
  const todos = useAgentRunTodos(run)
  useSidePanelWidth(
    isDiffMaximized
      ? { fullWidth: true }
      : isDiffTabShowingPatch
        ? { maxWidthVw: 60, initialWidthVw: 60 }
        : { maxWidthVw: 50, initialWidthVw: 45 }
  )
  const isActiveRun =
    isJobRunning(run?.status) ||
    run?.status === AgentRunStatus.Babysitting ||
    run?.status === AgentRunStatus.PendingApproval
  const hasRun: boolean = Boolean(run)
  const showWorkingTheoryTab = !isEmpty(todos) || hasRun || isActiveRun
  const showPrsTab = hasPullRequests
  const hasContentTabs =
    showDiffTab || showAnalysisTab || showWorkingTheoryTab || showPrsTab
  const isWriteMode = run?.mode === AgentRunMode.Write
  const expectsWorkingTheory =
    (isLoading || isActiveRun) && !showWorkingTheoryTab
  const expectsPullRequests =
    (isLoading || (isActiveRun && isWriteMode)) && !showPrsTab
  const expectsAnalysis =
    !showAnalysisTab &&
    (isLoading ||
      isActiveRun ||
      (run?.status === AgentRunStatus.Successful &&
        !(isWriteMode && hasPullRequests)))
  const showTabSkeleton =
    !hasContentTabs &&
    (expectsWorkingTheory || expectsPullRequests || expectsAnalysis)
  const showingTabContent =
    (showDiffTab &&
      selectedTab === AgentRunPanelTab.Diff &&
      !!run?.upload?.patch) ||
    (showAnalysisTab &&
      selectedTab === AgentRunPanelTab.Analysis &&
      !!run?.analysis) ||
    (showWorkingTheoryTab &&
      selectedTab === AgentRunPanelTab.WorkingTheory &&
      hasRun) ||
    (showPrsTab && selectedTab === AgentRunPanelTab.PullRequests && !!run)
  const showContentPlaceholder = showTabSkeleton && !showingTabContent
  const defaultTab = useMemo((): Nullable<AgentRunPanelTab> => {
    if (showDiffTab) return AgentRunPanelTab.Diff
    if (showAnalysisTab) return AgentRunPanelTab.Analysis
    if (showWorkingTheoryTab) return AgentRunPanelTab.WorkingTheory
    if (showPrsTab) return AgentRunPanelTab.PullRequests
    return null
  }, [showDiffTab, showAnalysisTab, showWorkingTheoryTab, showPrsTab])

  useEffect(() => {
    if (!runId || !defaultTab) return
    if (requestedTab === AgentRunPanelTab.Diff && !showDiffTab) return
    if (requestedTab) clearRequestedTab()
    setSelectedTab(defaultTab)
  }, [
    runId,
    defaultTab,
    showDiffTab,
    requestedTab,
    clearRequestedTab,
    setSelectedTab,
  ])

  return (
    <SidePanelContent hideResizeChrome={isDiffMaximized}>
      <PanelHeaderSC>
        {(hasContentTabs || run?.podReference || showTabSkeleton) && (
          <TabListWrapperSC>
            <Flex
              align="center"
              gap="small"
              css={{ width: '100%' }}
            >
              {hasContentTabs ? (
                <TabList
                  scrollable
                  stateRef={tabStateRef}
                  stateProps={{
                    orientation: 'horizontal',
                    selectedKey: selectedTab,
                    onSelectionChange: (key) => {
                      clearRequestedTab()
                      setSelectedTab(String(key) as AgentRunPanelTab)
                    },
                  }}
                  css={{ gap: spacing.small }}
                >
                  {showDiffTab && (
                    <PanelSubTabSC
                      key={AgentRunPanelTab.Diff}
                      textValue={AgentRunPanelTab.Diff}
                    >
                      <FileDiffIcon size={12} />
                      Diff
                    </PanelSubTabSC>
                  )}
                  {showAnalysisTab && (
                    <PanelSubTabSC
                      key={AgentRunPanelTab.Analysis}
                      textValue={AgentRunPanelTab.Analysis}
                    >
                      Analysis
                    </PanelSubTabSC>
                  )}
                  {showWorkingTheoryTab && (
                    <PanelSubTabSC
                      key={AgentRunPanelTab.WorkingTheory}
                      textValue={AgentRunPanelTab.WorkingTheory}
                    >
                      <HourglassIcon size={12} />
                      {AgentRunPanelTab.WorkingTheory}
                    </PanelSubTabSC>
                  )}
                  {showPrsTab && (
                    <PanelSubTabSC
                      key={AgentRunPanelTab.PullRequests}
                      textValue={AgentRunPanelTab.PullRequests}
                    >
                      <PrIcon size={12} />
                      Pull requests
                    </PanelSubTabSC>
                  )}
                </TabList>
              ) : (
                showTabSkeleton && (
                  <Flex
                    align="center"
                    gap="small"
                  >
                    {expectsAnalysis && <TabSkeletonSC $width={72} />}
                    {expectsWorkingTheory && <TabSkeletonSC $width={96} />}
                    {expectsPullRequests && <TabSkeletonSC $width={108} />}
                  </Flex>
                )
              )}
              {run?.podReference && (
                <PanelLinkTabSC
                  to={getPodDetailsPath({
                    type: 'agent-run',
                    agentRunId: run.id,
                    name: run.podReference.name,
                    namespace: run.podReference.namespace,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pod details
                  <ArrowTopRightIcon size={12} />
                </PanelLinkTabSC>
              )}
            </Flex>
          </TabListWrapperSC>
        )}
        <IconFrame
          clickable
          css={{ flexShrink: 0 }}
          icon={<CloseIcon />}
          onClick={() => setOpen(false)}
          tooltip="Close panel"
        />
      </PanelHeaderSC>
      {showDiffTab &&
        selectedTab === AgentRunPanelTab.Diff &&
        run?.upload?.patch && (
          <ContentWrapperFlushSC>
            <ContentInnerFlushSC>
              <AgentRunDiff
                runId={run.id}
                isFullscreen={diffFullscreen}
                onFullscreenChange={setDiffFullscreen}
              />
            </ContentInnerFlushSC>
          </ContentWrapperFlushSC>
        )}
      {showAnalysisTab &&
        selectedTab === AgentRunPanelTab.Analysis &&
        run?.analysis && (
          <ContentWrapperSC>
            <ContentInnerSC>
              {run.analysis.summary && (
                <Markdown
                  text={`# High level summary\n\n${run.analysis.summary}`}
                />
              )}
              {run.analysis.bullets && (
                <Markdown
                  text={`# Summary\n\n${`- ${run.analysis.bullets.join('\n- ')}`.trim()}`}
                />
              )}
              <Markdown text={run.analysis.analysis} />
            </ContentInnerSC>
          </ContentWrapperSC>
        )}
      {showWorkingTheoryTab &&
        selectedTab === AgentRunPanelTab.WorkingTheory &&
        run && (
          <ContentWrapperSC>
            <ContentInnerSC>
              <AgentRunWorkingTheory
                run={run}
                todos={todos}
                onViewDiff={() => setSelectedTab(AgentRunPanelTab.Diff)}
                onApprove={() => approval?.onApprove()}
                approving={approval?.approving ?? false}
              />
            </ContentInnerSC>
          </ContentWrapperSC>
        )}
      {showPrsTab && selectedTab === AgentRunPanelTab.PullRequests && run && (
        <ContentWrapperSC>
          <ContentInnerSC>
            <AgentRunPullRequests pullRequests={pullRequests} />
          </ContentInnerSC>
        </ContentWrapperSC>
      )}
      {showContentPlaceholder && (
        <ContentWrapperSC>
          <ContentInnerSC>
            {expectsAnalysis && (
              <>
                <RectangleSkeleton
                  $height={24}
                  $width="55%"
                />
                <RectangleSkeleton
                  $height={120}
                  $width="100%"
                />
                <RectangleSkeleton
                  $height={80}
                  $width="100%"
                />
              </>
            )}
            {expectsWorkingTheory && (
              <RectangleSkeleton
                $height="180px"
                $width="100%"
              />
            )}
            {expectsPullRequests && !expectsAnalysis && (
              <>
                <RectangleSkeleton
                  $height={20}
                  $width="45%"
                />
                <RectangleSkeleton
                  $height={72}
                  $width="100%"
                />
              </>
            )}
          </ContentInnerSC>
        </ContentWrapperSC>
      )}
    </SidePanelContent>
  )
}

export function useAgentRunPanel(autoOpen?: Nullable<boolean>) {
  const ctx = use(AgentRunPanelContext)

  const onAutoOpen = useEffectEvent(() => ctx.setOpen(true))
  const onUnmount = useEffectEvent(() => ctx.setOpen(false))
  useEffect(() => {
    if (!!autoOpen) onAutoOpen()
    return () => {
      if (!isNil(autoOpen)) onUnmount()
    }
  }, [autoOpen])

  return ctx
}

const ContentWrapperSC = styled.div(() => ({
  flex: 1,
  height: '100%',
  width: '100%',
  minHeight: 0,
  overflow: 'auto',
}))

const ContentWrapperFlushSC = styled(ContentWrapperSC)({
  overflow: 'hidden',
})

const ContentInnerSC = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: '100%',
}))

const ContentInnerFlushSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
})

const TabListWrapperSC = styled.div({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
})

const TabSkeletonSC = styled(RectangleSkeleton).attrs({ $height: 16 })(
  ({ theme }) => ({
    borderRadius: 20,
    flexShrink: 0,
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
    display: 'inline-flex',
    alignItems: 'center',
    boxSizing: 'border-box',
  })
)

const panelTabStyles = ({
  theme,
  active,
}: {
  theme: any
  active?: boolean
}) => ({
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
})

const PanelSubTabSC = styled(SubTab)(panelTabStyles)

const PanelLinkTabSC = styled(Link)(({ theme }) => ({
  ...panelTabStyles({ theme }),
  textDecoration: 'none',
}))
