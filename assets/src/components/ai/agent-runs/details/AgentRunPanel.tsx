import {
  ArrowTopRightIcon,
  CloseIcon,
  FileDiffIcon,
  Flex,
  IconFrame,
  ListIcon,
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
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import {
  AgentRunMode,
  AgentRunStatus,
  useAgentRunQuery,
} from 'generated/graphql'
import { isEmpty, isNil } from 'lodash'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
import { AgentRunTodos } from './AgentRunTodos.tsx'
import { useAgentRunTodos } from './AIAgentRunSidecar.tsx'

const SIDE_PANEL_TYPE: SidePanel = 'agent-run'
type AgentRunPanelTab = 'Diff' | 'Analysis' | 'Agent todos' | 'Pull requests'

export function AgentRunPanelContent() {
  const { spacing } = useTheme()
  const { pathname } = useLocation()
  const runId =
    matchPath(AI_AGENT_RUN_ABS_PATH, pathname)?.params[
      AI_AGENT_RUNS_PARAM_RUN_ID
    ] ?? ''
  const { setOpen } = useAgentRunPanel()
  const tabStateRef = useRef<any>(null)
  const [selectedTab, setSelectedTab] = useState<AgentRunPanelTab>('Analysis')

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
  const todos = useAgentRunTodos(run)
  const showAgentTodosTab = !isEmpty(todos)
  const showPrsTab = hasPullRequests
  const hasContentTabs =
    showDiffTab || showAnalysisTab || showAgentTodosTab || showPrsTab
  const isWriteMode = run?.mode === AgentRunMode.Write
  const isActiveRun =
    isJobRunning(run?.status) ||
    run?.status === AgentRunStatus.Babysitting ||
    run?.status === AgentRunStatus.PendingApproval
  const expectsTodos = (isLoading || isActiveRun) && !showAgentTodosTab
  const expectsPullRequests =
    (isLoading || (isActiveRun && isWriteMode)) && !showPrsTab
  const expectsAnalysis =
    !showAnalysisTab &&
    (isLoading ||
      isActiveRun ||
      (run?.status === AgentRunStatus.Successful &&
        !(isWriteMode && hasPullRequests)))
  const showTabSkeleton =
    !hasContentTabs && (expectsTodos || expectsPullRequests || expectsAnalysis)
  const showingTabContent =
    (showDiffTab && selectedTab === 'Diff' && !!run?.upload?.patch) ||
    (showAnalysisTab && selectedTab === 'Analysis' && !!run?.analysis) ||
    (showAgentTodosTab && selectedTab === 'Agent todos' && !!run) ||
    (showPrsTab && selectedTab === 'Pull requests' && !!run)
  const showContentPlaceholder = showTabSkeleton && !showingTabContent
  const defaultTab = useMemo((): Nullable<AgentRunPanelTab> => {
    if (showDiffTab) return 'Diff'
    if (showAnalysisTab) return 'Analysis'
    if (showAgentTodosTab) return 'Agent todos'
    if (showPrsTab) return 'Pull requests'
    return null
  }, [showDiffTab, showAnalysisTab, showAgentTodosTab, showPrsTab])

  useEffect(() => {
    if (!defaultTab) return
    setSelectedTab((tab) => {
      if (tab === 'Diff' && showDiffTab) return tab
      if (tab === 'Analysis' && showAnalysisTab) return tab
      if (tab === 'Agent todos' && showAgentTodosTab) return tab
      if (tab === 'Pull requests' && showPrsTab) return tab
      return defaultTab
    })
  }, [defaultTab, showDiffTab, showAnalysisTab, showAgentTodosTab, showPrsTab])

  return (
    <SidePanelContent>
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
                    onSelectionChange: (key) =>
                      setSelectedTab(String(key) as AgentRunPanelTab),
                  }}
                  css={{ gap: spacing.small }}
                >
                  {showDiffTab && (
                    <PanelSubTabSC
                      key="Diff"
                      textValue="Diff"
                    >
                      <FileDiffIcon size={12} />
                      Diff
                    </PanelSubTabSC>
                  )}
                  {showAnalysisTab && (
                    <PanelSubTabSC
                      key="Analysis"
                      textValue="Analysis"
                    >
                      Analysis
                    </PanelSubTabSC>
                  )}
                  {showAgentTodosTab && (
                    <PanelSubTabSC
                      key="Agent todos"
                      textValue="Agent todos"
                    >
                      <ListIcon size={12} />
                      Agent todos
                    </PanelSubTabSC>
                  )}
                  {showPrsTab && (
                    <PanelSubTabSC
                      key="Pull requests"
                      textValue="Pull requests"
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
                    {expectsTodos && <TabSkeletonSC $width={96} />}
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
      {showDiffTab && selectedTab === 'Diff' && run?.upload?.patch && (
        <ContentWrapperSC>
          <ContentInnerSC>
            <AgentRunDiff patchUrl={run.upload.patch} />
          </ContentInnerSC>
        </ContentWrapperSC>
      )}
      {showAnalysisTab && selectedTab === 'Analysis' && run?.analysis && (
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
      {showAgentTodosTab && selectedTab === 'Agent todos' && run && (
        <ContentWrapperSC>
          <ContentInnerSC>
            <AgentRunTodos todos={todos} />
          </ContentInnerSC>
        </ContentWrapperSC>
      )}
      {showPrsTab && selectedTab === 'Pull requests' && run && (
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
            {expectsTodos && (
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
