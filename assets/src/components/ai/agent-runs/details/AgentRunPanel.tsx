import {
  CloseIcon,
  IconFrame,
  Markdown,
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
import {
  AgentRunMode,
  AgentRunStatus,
  useAgentRunQuery,
} from 'generated/graphql'
import { isNil } from 'lodash'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import {
  AI_AGENT_RUN_ABS_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
} from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'

const SIDE_PANEL_TYPE: SidePanel = 'agent-run'
type AgentRunPanelTab = 'Analysis'

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

  const { data } = useAgentRunQuery({
    skip: !runId,
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
  })
  const run = data?.agentRun

  const hasPullRequests = Boolean(run?.pullRequests?.some(Boolean))
  const isTerminalStatus =
    run?.status === AgentRunStatus.Successful ||
    run?.status === AgentRunStatus.Failed ||
    run?.status === AgentRunStatus.Cancelled
  const showAnalysisTab =
    !!run?.analysis &&
    (run.mode !== AgentRunMode.Write || (!hasPullRequests && isTerminalStatus))

  return (
    <SidePanelContent>
      <PanelHeaderSC>
        {showAnalysisTab && (
          <TabListWrapperSC>
            <TabList
              scrollable
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: selectedTab,
                onSelectionChange: (key) =>
                  setSelectedTab(String(key) as AgentRunPanelTab),
              }}
              css={{ gap: spacing.small, width: '100%' }}
            >
              <PanelSubTabSC
                key="Analysis"
                textValue="Analysis"
              >
                Analysis
              </PanelSubTabSC>
            </TabList>
          </TabListWrapperSC>
        )}
        <IconFrame
          clickable
          css={{
            flexShrink: 0,
            marginLeft: showAnalysisTab ? undefined : 'auto',
          }}
          icon={<CloseIcon />}
          onClick={() => setOpen(false)}
          tooltip="Close panel"
        />
      </PanelHeaderSC>
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
            {run.analysis.analysis && (
              <Markdown text={`# Full analysis\n\n${run.analysis.analysis}`} />
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
