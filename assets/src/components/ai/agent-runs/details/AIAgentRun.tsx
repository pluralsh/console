import {
  ArrowTopRightIcon,
  Button,
  Card,
  Divider,
  Flex,
  IconFrame,
  PrIcon,
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
import { Body2P } from 'components/utils/typography/Text.tsx'
import {
  AgentRunFragment,
  AgentRunStatus,
  useAgentRunQuery,
  useApproveAgentRunMutation,
  useCancelAgentRunMutation,
  useCreateAgentRunPromptMutation,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AI_AGENT_RUNS_ABS_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
  AI_AGENT_RUNS_REL_PATH,
  getAgentRunAbsPath,
} from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { getAIBreadcrumbs } from '../../AI.tsx'
import {
  ChatInputSimple,
  ChatInputSimpleRef,
} from '../../chatbot/input/ChatInput.tsx'
import { AgentRunStatusChip } from './AgentRunStatusChip.tsx'
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
  const [approveAgentRun, { loading: approving, error: approvingError }] =
    useApproveAgentRunMutation({
      variables: { id },
      refetchQueries: ['AgentRun', 'PendingApprovalAgentRuns'],
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
  const isApprovable =
    run?.status === AgentRunStatus.PendingApproval && !run.approvedAt
  const canReprompt =
    (run?.status === AgentRunStatus.PendingApproval && !run.approvedAt) ||
    run?.status === AgentRunStatus.Babysitting

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
            <Divider
              backgroundColor="border"
              marginTop="small"
              marginBottom="small"
            />
            {run && (
              <AgentRunStatusCallout
                run={run}
                isApprovable={isApprovable}
                approving={approving}
                onApprove={() => approveAgentRun()}
              />
            )}
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
            {run && canReprompt && <AgentRunRepromptInput run={run} />}
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
        error={
          cancellingError
            ? 'Cancelling agent run failed'
            : 'Approving agent run failed'
        }
        show={!!cancellingError || !!approvingError}
        closeTimeout={5000}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        {(cancellingError || approvingError)?.message}
      </Toast>
    </>
  )
}

function AgentRunRepromptInput({ run }: { run: AgentRunFragment }) {
  const inputRef = useRef<Nullable<ChatInputSimpleRef>>(null)
  const [prompt, setPrompt] = useState('')
  const [createPrompt, { loading, error }] = useCreateAgentRunPromptMutation({
    refetchQueries: ['AgentRun', 'PendingApprovalAgentRuns'],
    awaitRefetchQueries: true,
    onCompleted: () => {
      setPrompt('')
      inputRef.current?.resetInput()
    },
  })

  const submitPrompt = () => {
    const content = prompt.trim()
    if (!content) return

    createPrompt({
      variables: {
        id: run.id,
        prompt: content,
      },
    })
  }

  return (
    <RepromptInputWrapperSC>
      {error && (
        <GqlError
          error={error}
          margin="small"
        />
      )}
      <ChatInputSimple
        ref={inputRef}
        bgColor="fill-zero-selected"
        placeholder={
          run.status === AgentRunStatus.Babysitting
            ? 'Ask the agent to follow up on the draft PR.'
            : 'Ask the agent to revise the pending changes before you approve.'
        }
        setValue={setPrompt}
        onSubmit={submitPrompt}
        loading={loading}
        allowSubmit={!!prompt.trim()}
        wrapperStyles={{ minHeight: 112 }}
      />
    </RepromptInputWrapperSC>
  )
}

function AgentRunStatusCallout({
  run,
  isApprovable,
  approving,
  onApprove,
}: {
  run: AgentRunFragment
  isApprovable: boolean
  approving: boolean
  onApprove: () => void
}) {
  const theme = useTheme()
  const pullRequest = run.pullRequests?.[0]
  const title = pullRequest?.title ?? agentRunStatusTitle(run.status)
  const summary = run.analysis?.summary

  return (
    <StatusCalloutSC
      fillLevel={1}
      $status={run.status}
    >
      <StretchedFlex
        align="start"
        gap="medium"
      >
        <StackedText
          truncate
          first={title}
          firstPartialType="body2Bold"
          firstColor="text-light"
          second={pullRequest?.title ? agentRunStatusTitle(run.status) : null}
          secondColor="text-xlight"
          icon={
            <IconFrame
              circle
              size="large"
              type="secondary"
              icon={
                <PrIcon
                  size="small"
                  color="icon-light"
                />
              }
              css={{ flexShrink: 0 }}
            />
          }
          css={{ flex: 1, minWidth: 0 }}
        />
        <AgentRunStatusChip
          status={run.status}
          fillLevel={2}
          css={{ flexShrink: 0 }}
        />
      </StretchedFlex>
      {summary && (
        <Body2P
          $color="text-light"
          css={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {summary}
        </Body2P>
      )}
      {(pullRequest?.url || isApprovable) && (
        <Flex
          justify="flex-end"
          gap="small"
          css={{ marginTop: theme.spacing.xsmall }}
        >
          {pullRequest?.url && (
            <Button
              small
              secondary
              as="a"
              href={pullRequest.url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<ArrowTopRightIcon size={12} />}
            >
              View PR
            </Button>
          )}
          {isApprovable && (
            <Button
              small
              onClick={onApprove}
              loading={approving}
            >
              Approve agent run
            </Button>
          )}
        </Flex>
      )}
    </StatusCalloutSC>
  )
}

function agentRunStatusTitle(status: AgentRunStatus) {
  switch (status) {
    case AgentRunStatus.PendingApproval:
      return 'Approval required'
    case AgentRunStatus.Successful:
      return 'Run complete'
    case AgentRunStatus.Failed:
      return 'Run failed'
    case AgentRunStatus.Cancelled:
      return 'Run cancelled'
    case AgentRunStatus.Babysitting:
      return 'Babysitting'
    case AgentRunStatus.Running:
      return 'Agent run in progress'
    case AgentRunStatus.Pending:
      return 'Agent run pending'
  }
}

const PanelOpenBtnSC = styled(Button)(({ theme }) => ({
  height: '100%',
  borderLeft: theme.borders.default,
}))

const statusToBorderColor = {
  [AgentRunStatus.PendingApproval]: 'icon-warning',
  [AgentRunStatus.Successful]: 'icon-success',
  [AgentRunStatus.Failed]: 'icon-danger',
  [AgentRunStatus.Cancelled]: 'icon-xlight',
  [AgentRunStatus.Babysitting]: 'icon-info',
  [AgentRunStatus.Running]: 'icon-info',
  [AgentRunStatus.Pending]: 'icon-info',
} as const

const StatusCalloutSC = styled(Card)<{ $status: AgentRunStatus }>(
  ({ theme, $status }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    padding: theme.spacing.medium,
    width: '100%',
    borderLeft: `3px solid ${theme.colors[statusToBorderColor[$status]]}`,
  })
)

const RepromptInputWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  paddingTop: theme.spacing.medium,
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
