import {
  Checkbox,
  Chip,
  EmptyState,
  Markdown,
  Sidecar,
  SidecarItem,
  SubTab,
  Table,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  AgentMessage,
  AgentRun,
  AgentRunFragment,
  AgentRunMode,
  ChatType,
  PullRequestFragment,
  useAgentRunQuery,
} from 'generated/graphql'
import { capitalize, isEmpty, truncate } from 'lodash'
import { ReactElement, useMemo, useRef } from 'react'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  AI_AGENT_RUNS_ANALYSIS_REL_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
  AI_AGENT_RUNS_PULL_REQUESTS_REL_PATH,
  AI_AGENT_RUNS_REL_PATH,
} from 'routes/aiRoutesConsts'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ColActions,
  ColInsertedAt,
  ColStatus,
  ColTitle,
} from '../../self-service/pr/queue/PrQueueColumns.tsx'
import { ResponsiveLayoutContentContainer } from '../../utils/layout/ResponsiveLayoutContentContainer.tsx'
import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage.tsx'
import { LinkTabWrap } from '../../utils/Tabs.tsx'
import { VirtualList } from '../../utils/VirtualList.tsx'
import { getAIBreadcrumbs } from '../AI'
import { ChatMessage } from '../chatbot/ChatMessage'
import { agentRunStatusToSeverity } from './AIAgentRuns'

export function AIAgentRun() {
  const theme = useTheme()
  const id = useParams()[AI_AGENT_RUNS_PARAM_RUN_ID]
  const { data, error, loading } = useAgentRunQuery({
    variables: { id: id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !id,
  })
  const runLoading = !data && loading
  const run = data?.agentRun

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getAIBreadcrumbs(AI_AGENT_RUNS_REL_PATH),
        { label: run?.prompt ? truncate(run.prompt, { length: 20 }) : '' },
      ],
      [run?.prompt]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <ResponsiveLayoutContentContainer css={{ maxWidth: '100%' }}>
        <AgentRunHeader
          run={run}
          loading={runLoading}
        />
        <div
          css={{
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet
            context={{
              run,
            }}
          />
        </div>
      </ResponsiveLayoutContentContainer>
      <AgentRunSidecar run={run} />
    </ResponsiveLayoutPage>
  )
}
function AgentRunSidecar({ run }: { run: Nullable<AgentRunFragment> }) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!run ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
          <SidecarItem heading="ID">{run.id}</SidecarItem>
          <SidecarItem heading="Status">
            <Chip
              size="small"
              severity={agentRunStatusToSeverity[run.status]}
            >
              {capitalize(run.status)}
            </Chip>
          </SidecarItem>
          {run.mode && (
            <SidecarItem heading="Mode">
              <Chip
                size="small"
                severity="info"
              >
                {capitalize(run.mode)}
              </Chip>
            </SidecarItem>
          )}
          {run.runtime?.name && (
            <SidecarItem heading="Runtime">{run.runtime.name}</SidecarItem>
          )}
          {!isEmpty(run.todos) && (
            <SidecarItem heading="Todos">
              {run.todos?.filter(isNonNullable).map((todo) => (
                <StackedText
                  key={todo.title}
                  first={todo.title}
                  second={todo.description}
                  icon={
                    <Checkbox
                      small
                      checked={!!todo.done}
                      style={{ userSelect: 'none', cursor: 'default' }}
                    />
                  }
                />
              ))}
            </SidecarItem>
          )}
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}

function getDirectory() {
  return [
    { path: '', label: 'Progress' },
    {
      path: AI_AGENT_RUNS_ANALYSIS_REL_PATH,
      label: 'Analysis',
      condition: (s: AgentRun) => s?.mode === AgentRunMode.Analyze,
    },
    {
      path: AI_AGENT_RUNS_PULL_REQUESTS_REL_PATH,
      label: 'Pull Requests',
      condition: (s: AgentRun) => s?.mode === AgentRunMode.Write,
    },
  ]
}

function AgentRunHeader({ run, loading }): ReactElement {
  const theme = useTheme()
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const directory = getDirectory()
  const currentTab = useMemo(
    () =>
      directory.find((d) => d.path && pathname.includes(d.path)) ??
      directory[0],
    [directory, pathname]
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        marginBottom: theme.spacing.medium,
      }}
    >
      <div
        css={{
          paddingBottom: theme.spacing.medium,
          borderBottom: theme.borders.default,
        }}
      >
        <StackedText
          loading={loading}
          first={run?.prompt}
          firstPartialType="subtitle1"
          firstColor="text"
          secondPartialType="body2"
          secondColor="text-xlight"
        />
      </div>
      <TabList
        scrollable
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: currentTab?.path,
        }}
      >
        {directory
          .filter((d) => d.condition?.(run) ?? true)
          .map(({ label, path }) => (
            <LinkTabWrap
              subTab
              key={path}
              to={path}
            >
              <SubTab key={path}>{label}</SubTab>
            </LinkTabWrap>
          ))}
      </TabList>
    </div>
  )
}

export function AgentRunMessages(): ReactElement {
  const { run } = useOutletContext<{ run: AgentRun }>()
  const messages = run?.messages?.filter(isNonNullable) ?? []

  return isEmpty(messages) ? (
    <EmptyState message="No messages found" />
  ) : (
    <VirtualList
      data={messages as Array<AgentMessage>}
      renderer={({ rowData }) => (
        <div>
          <ChatMessage
            key={rowData.id}
            content={
              !!rowData?.metadata?.tool
                ? rowData?.metadata?.tool?.output
                : !!rowData?.metadata?.file
                  ? rowData?.metadata?.file?.text
                  : rowData.message
            }
            type={
              !!rowData?.metadata?.tool
                ? ChatType.Tool
                : !!rowData?.metadata?.file
                  ? ChatType.File
                  : ChatType.Text
            }
            role={rowData.role}
            highlightToolContent
            attributes={{
              file: { name: rowData?.metadata?.file?.name },
              tool: { name: rowData?.metadata?.tool?.name },
            }}
          />
        </div>
      )}
    />
  )
}

export function AgentRunAnalysis(): ReactElement {
  const theme = useTheme()
  const { run } = useOutletContext<{ run: AgentRun }>()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
        height: '100%',
        overflow: 'auto',
      }}
    >
      <div
        css={{
          paddingBottom: theme.spacing.large,
          borderBottom: theme.borders.default,
        }}
      >
        <h1>Summary</h1>
        <Markdown
          text={
            run?.analysis?.summary.concat(
              run?.analysis?.bullets?.join('\n- ') ?? ''
            ) ?? ''
          }
        />
      </div>
      <div>
        <h1>Analysis Breakdown</h1>
        <Markdown text={run?.analysis?.analysis ?? ''} />
      </div>
    </div>
  )
}

export function AgentRunPullRequests(): ReactElement {
  const { run } = useOutletContext<{ run: AgentRun }>()

  return (
    <Table
      fullHeightWrap
      columns={[ColTitle, ColStatus, ColInsertedAt, ColActions]}
      data={
        (run?.pullRequests?.map((pr) => ({ node: pr })) ?? []) satisfies Array<{
          node: Nullable<PullRequestFragment>
        }>
      }
      virtualizeRows
    />
  )
}
