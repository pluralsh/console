import {
  ArrowTopRightIcon,
  Button,
  Divider,
  Flex,
  SidePanelOpenIcon,
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
import { AIAgentRunLocalButton } from './AIAgentRunLocalButton.tsx'
import { AIAgentRunMessages } from './AIAgentRunMessages.tsx'
import { AIAgentRunShareButton } from './AIAgentRunShareButton.tsx'
import { AgentRunMetadata } from './AIAgentRunSidecar.tsx'
import { useAgentRunPanel } from './AgentRunPanel.tsx'

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
  const { isOpen, setOpen } = useAgentRunPanel(!!run?.id)
  const isRunning =
    run?.status == AgentRunStatus.Running ||
    run?.status == AgentRunStatus.Pending
  const isCancellable = isRunning || run?.status == AgentRunStatus.Babysitting

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
    <>
      <StretchedFlex
        gap="small"
        height="100%"
      >
        <WrapperSC>
          <Flex
            direction="column"
            flex={1}
            minWidth={0}
            height="100%"
            overflow="auto"
          >
            <StretchedFlex
              gap="xxxxlarge"
              alignItems="start"
              css={{ paddingBottom: spacing.large }}
            >
              <Flex
                direction="column"
                flex={1}
                minWidth={0}
                gap="small"
              >
                <StackedText
                  truncate
                  loading={runLoading}
                  first={run?.prompt}
                  firstPartialType="subtitle2"
                  firstColor="text"
                  second={run && <AgentRunMetadata run={run} />}
                  gap="xsmall"
                />
              </Flex>
              <Flex gap="small">
                {isCancellable && (
                  <Button
                    small
                    secondary
                    onClick={() => cancelAgentRun()}
                    startIcon={<SpinnerAlt />}
                    loading={cancelling}
                  >
                    Cancel agent run
                  </Button>
                )}
                {run?.upload?.session && (
                  <AIAgentRunLocalButton
                    runId={run.id}
                    repository={run.repository}
                  />
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
            {!!run ? (
              <AIAgentRunMessages run={run} />
            ) : runLoading ? (
              <RectangleSkeleton
                $width="100%"
                $height={400}
              />
            ) : null}
          </Flex>
        </WrapperSC>
        {!isOpen && (
          <PanelOpenBtnSC
            tertiary
            onClick={() => setOpen(true)}
          >
            <SidePanelOpenIcon />
          </PanelOpenBtnSC>
        )}
      </StretchedFlex>
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
    </>
  )
}

const PanelOpenBtnSC = styled(Button)(({ theme }) => ({
  height: '100%',
  borderLeft: theme.borders.default,
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
  width: '100%',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  flex: 1,
}))
