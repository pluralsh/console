import {
  ArrowTopRightIcon,
  Button,
  Divider,
  Flex,
  prettifyRepoUrl,
  SpinnerAlt,
  Toast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { RunShareMenu } from 'components/ai/RunShareMenu.tsx'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import {
  AgentRunStatus,
  useAgentRunQuery,
  useCancelAgentRunMutation,
  useShareAgentRunMutation,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AI_AGENT_RUNS_ABS_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
  AI_AGENT_RUNS_REL_PATH,
  getAgentRunAbsPath,
} from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { getAIBreadcrumbs } from '../../AI.tsx'
import { AgentRunAnalysis } from './AIAgentRunAnalysis.tsx'
import { AIAgentRunMessages } from './AIAgentRunMessages.tsx'
import { AgentRunSidecar } from './AIAgentRunSidecar.tsx'
import { PullRequestCallout } from './PullRequestCallout.tsx'

export const getAgentRunBreadcrumbs = (
  runId: string,
  prompt: string,
  tab?: string
) => {
  const prefix = getAgentRunAbsPath({ agentRunId: runId })
  return [
    ...getAIBreadcrumbs(AI_AGENT_RUNS_REL_PATH),
    { label: prompt ? truncate(prompt, { length: 20 }) : '', url: prefix },
    ...(tab
      ? [{ label: tab, url: tab === 'pods' ? undefined : `${prefix}/${tab}` }]
      : []),
  ]
}

export function AIAgentRun() {
  const { spacing } = useTheme()
  const id = useParams()[AI_AGENT_RUNS_PARAM_RUN_ID] ?? ''

  const [cancelAgentRun, { loading: cancelling, error: cancellingError }] =
    useCancelAgentRunMutation({
      variables: { id },
    })

  const { data, error, loading } = useAgentRunQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !id,
  })
  const [shareAgentRun, { loading: shareLoading, error: shareError }] =
    useShareAgentRunMutation()

  const runLoading = !data && loading
  const run = data?.agentRun

  useSetBreadcrumbs(
    useMemo(
      () => getAgentRunBreadcrumbs(id, run?.prompt ?? ''),
      [id, run?.prompt]
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
    <WrapperSC>
      <Flex
        direction="column"
        gap="large"
        flex={1}
        minWidth={0}
        paddingRight={spacing.xsmall}
        overflow="auto"
      >
        <StretchedFlex gap="xxxxxxlarge">
          <StackedText
            truncate
            loading={runLoading}
            first={run?.prompt}
            firstPartialType="subtitle1"
            firstColor="text"
            second={prettifyRepoUrl(run?.repository ?? '')}
            secondPartialType="body2"
            secondColor="text-xlight"
          />
          <Flex gap="small">
            {(run?.status == AgentRunStatus.Running ||
              run?.status == AgentRunStatus.Pending) && (
              <Button
                onClick={() => cancelAgentRun()}
                startIcon={<SpinnerAlt />}
                loading={cancelling}
                secondary
              >
                Cancel agent run
              </Button>
            )}
            {run?.status !== AgentRunStatus.Failed && (
              <RunShareMenu
                isShared={run?.shared}
                setIsShared={(shared) =>
                  shareAgentRun({ variables: { id, shared } })
                }
                loading={shareLoading}
                error={shareError}
                label="Share run"
              />
            )}
          </Flex>
        </StretchedFlex>
        <Divider backgroundColor="border" />
        {run?.error ? (
          <GqlError
            header="There was an error during this run."
            error={run.error}
            action={
              <Button
                as={Link}
                to={AI_AGENT_RUNS_ABS_PATH}
                endIcon={<ArrowTopRightIcon />}
              >
                Return to agent runs
              </Button>
            }
          />
        ) : (
          <>
            {run?.pullRequests?.filter(isNonNullable)?.map((pr) => (
              <PullRequestCallout
                key={pr.id}
                pullRequest={pr}
              />
            ))}
            {run?.analysis && <AgentRunAnalysis analysis={run.analysis} />}
            <StackedText
              first="Agent activity"
              firstPartialType="body2Bold"
              firstColor="text"
              second="Trace agent progress during this run"
              secondPartialType="body2"
              secondColor="text-light"
            />
            {!!run ? (
              <AIAgentRunMessages run={run} />
            ) : runLoading ? (
              <RectangleSkeleton
                $width="100%"
                $height={400}
              />
            ) : null}
          </>
        )}
      </Flex>
      <AgentRunSidecar
        run={run}
        loading={loading}
      />
      <Toast
        error={'Cancelling agent run failed'}
        show={!!cancellingError}
        closeTimeout={5000}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        {cancellingError?.message}
      </Toast>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
  width: '100%',
}))
