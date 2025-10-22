import {
  Checkbox,
  Chip,
  EmptyState,
  Flex,
  Sidecar,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  AgentRunFragment,
  AgentRunMode,
  useAgentRunQuery,
} from 'generated/graphql'
import { capitalize, isEmpty, truncate } from 'lodash'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  AI_AGENT_RUNS_PARAM_RUN_ID,
  AI_AGENT_RUNS_REL_PATH,
} from 'routes/aiRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { getAIBreadcrumbs } from '../AI'
import { ChatMessage } from '../chatbot/ChatMessage'
import { DetailsPageWithSidecarWrapper } from '../sentinels/sentinel/Sentinel'
import { agentRunStatusToSeverity } from './AIAgentRuns'

export function AIAgentRun() {
  const id = useParams()[AI_AGENT_RUNS_PARAM_RUN_ID]
  const { data, error, loading } = useAgentRunQuery({
    variables: { id: id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !id,
  })
  const runLoading = !data && loading
  const run = data?.agentRun
  const messages = run?.messages?.filter(isNonNullable)

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
    <DetailsPageWithSidecarWrapper
      header={
        <>
          <StackedText
            loading={runLoading}
            first={run?.prompt}
            firstPartialType="subtitle1"
            firstColor="text"
            secondPartialType="body2"
            secondColor="text-xlight"
          />
        </>
      }
      content={
        <Flex
          direction="column"
          overflow="auto"
          height="100%"
          minHeight={0}
        >
          {isEmpty(messages) ? (
            <EmptyState message="No messages found" />
          ) : (
            messages?.map((message) => (
              <ChatMessage
                key={message.id}
                {...message}
              />
            ))
          )}
        </Flex>
      }
      sidecar={<AgentRunSidecar run={run} />}
    ></DetailsPageWithSidecarWrapper>
  )
}
function AgentRunSidecar({ run }: { run: Nullable<AgentRunFragment> }) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!run ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
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
          {run.mode === AgentRunMode.Analyze && run.analysis && (
            <SidecarItem heading="Analysis">
              <StackedText
                first={run.analysis.summary}
                second={run.analysis.analysis}
              />
              <ul>
                {run.analysis.bullets
                  ?.filter(isNonNullable)
                  .map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </SidecarItem>
          )}
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}
