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
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import {
  AgentRunStatus,
  useAgentRunQuery,
  useCancelAgentRunMutation,
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
import { getAIBreadcrumbs } from '../../AI.tsx'
import { AgentRunAnalysis } from './AIAgentRunAnalysis.tsx'
import { AIAgentRunMessages } from './AIAgentRunMessages.tsx'
import { AIAgentRunShareButton } from './AIAgentRunShareButton.tsx'
import { AgentRunSidecar } from './AIAgentRunSidecar.tsx'

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

  const runLoading = !data && loading
  const run = data?.agentRun
  const isRunning =
    run?.status == AgentRunStatus.Running ||
    run?.status == AgentRunStatus.Pending

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
        paddingRight={spacing.medium}
        overflow="auto"
      >
        <StretchedFlex gap="xxxxlarge">
          <StackedText
            truncate
            loading={runLoading}
            first={run?.prompt}
            firstPartialType="subtitle1"
            firstColor="text"
            second={prettifyRepoUrl(run?.repository ?? '')}
            secondPartialType="body2"
            secondColor="text-xlight"
            css={{ flex: 1 }}
          />
          <Flex gap="small">
            {isRunning && (
              <Button
                secondary
                onClick={() => cancelAgentRun()}
                startIcon={<SpinnerAlt />}
                loading={cancelling}
              >
                Cancel agent run
              </Button>
            )}
            {run && <AIAgentRunShareButton runId={run?.id} />}
          </Flex>
        </StretchedFlex>
        <Divider backgroundColor="border" />
        {run?.error && (
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
        )}
        {run?.analysis && <AgentRunAnalysis analysis={run.analysis} />}
        {!isRunning && (
          <StackedText
            first="Agent activity"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Trace agent progress during this run"
            secondPartialType="body2"
            secondColor="text-light"
          />
        )}
        {!!run ? (
          <AIAgentRunMessages run={run} />
        ) : runLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height={400}
          />
        ) : null}
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
  height: '100%',
  minHeight: 0,
}))
