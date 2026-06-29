import {
  ArrowTopRightIcon,
  Button,
  Card,
  CircleDashIcon,
  Flex,
  IconFrame,
  PrIcon,
  SidePanelOpenIcon,
  SpinnerAlt,
  Toast,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { WorkbenchLinkChip } from 'components/workbenches/common/WorkbenchLinkChip'
import { GqlError } from 'components/utils/Alert'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { TRUNCATE } from 'components/utils/truncate'
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
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
import { AIAgentRunLocalButton } from './AIAgentRunLocalButton.tsx'
import { AIAgentRunMessages } from './AIAgentRunMessages.tsx'
import { AIAgentRunShareButton } from './AIAgentRunShareButton.tsx'
import { AgentRunMetadata } from './AIAgentRunSidecar.tsx'
import { AgentRunPanelTab, useAgentRunPanel } from './AgentRunPanel.tsx'

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
  const hasPersistedAgentTodos = hasAgentRunTodos(run)
  const { isOpen, setOpen } = useAgentRunPanel(
    !!run?.id && hasPersistedAgentTodos
  )
  const isRunning =
    run?.status == AgentRunStatus.Running ||
    run?.status == AgentRunStatus.Pending
  const isApprovable =
    run?.status === AgentRunStatus.PendingApproval && !run.approvedAt
  const isCancellable =
    isRunning ||
    run?.status == AgentRunStatus.Babysitting ||
    (run?.status === AgentRunStatus.PendingApproval && !run.approvedAt)
  const isPromptConsuming =
    (run?.status === AgentRunStatus.PendingApproval && !run.approvedAt) ||
    run?.status === AgentRunStatus.Babysitting
  const canReprompt =
    isPromptConsuming ||
    (run?.status === AgentRunStatus.Running && (run.approval || run.babysit))

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
              gap="medium"
              alignItems="start"
            >
              <StackedText
                truncate
                loading={runLoading}
                first={run?.prompt}
                firstPartialType="subtitle2"
                firstColor="text"
                second={run && <AgentRunMetadata run={run} />}
                css={{ flex: 1, minWidth: 0 }}
              />
              <Flex
                gap="small"
                css={{ flexShrink: 0 }}
              >
                {isCancellable && (
                  <Button
                    small
                    secondary
                    onClick={() => cancelAgentRun()}
                    startIcon={<SpinnerAlt />}
                    loading={cancelling}
                  >
                    Cancel
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

            {run && (
              <AgentRunStatusCallout
                run={run}
                isApprovable={isApprovable}
                approving={approving}
                onApprove={() => approveAgentRun()}
                onViewDiff={() => setOpen(true, AgentRunPanelTab.Diff)}
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
        {hasPersistedAgentTodos && !isOpen && (
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

function hasAgentRunTodos(run: Nullable<AgentRunFragment>) {
  return (run?.todos ?? []).some((todo) => {
    const title = todo?.title?.trim() ?? ''
    const description = todo?.description?.trim() ?? ''

    return title.length > 0 || description.length > 0
  })
}

function AgentRunRepromptInput({ run }: { run: AgentRunFragment }) {
  const inputRef = useRef<Nullable<ChatInputSimpleRef>>(null)
  const canDispatchQueuedPromptRef = useRef(false)
  const queuedPromptInFlightRef = useRef<Nullable<string>>(null)
  const queuedPromptDispatchIdsRef = useRef<Set<string>>(new Set())
  const [prompt, setPrompt] = useState('')
  const [chatQueue, setChatQueue] = useState<{ id: string; message: string }[]>(
    []
  )
  const [createPrompt, { loading, error }] = useCreateAgentRunPromptMutation({
    refetchQueries: ['AgentRun', 'PendingApprovalAgentRuns'],
    awaitRefetchQueries: true,
  })
  const isRunning = run.status === AgentRunStatus.Running
  const isPromptConsuming =
    (run.status === AgentRunStatus.PendingApproval && !run.approvedAt) ||
    run.status === AgentRunStatus.Babysitting

  const resetInput = () => {
    setPrompt('')
    inputRef.current?.resetInput()
  }

  const enqueuePrompt = (message: string) => {
    setChatQueue((prev) => [...prev, { id: Math.random().toString(), message }])
    resetInput()
  }

  const createRunPrompt = (message: string, resetOnCompleted = false) => {
    createPrompt({
      variables: {
        id: run.id,
        prompt: message,
      },
    })
      .then(() => {
        if (resetOnCompleted) resetInput()
      })
      .catch(() => undefined)
  }

  const sendTopQueuePrompt = useEffectEvent(() => {
    if (
      !isPromptConsuming ||
      !canDispatchQueuedPromptRef.current ||
      loading ||
      !chatQueue.length
    )
      return

    const queuedPrompt = chatQueue[0]
    if (
      queuedPromptInFlightRef.current ||
      queuedPromptDispatchIdsRef.current.has(queuedPrompt.id)
    )
      return

    canDispatchQueuedPromptRef.current = false
    queuedPromptInFlightRef.current = queuedPrompt.id
    queuedPromptDispatchIdsRef.current.add(queuedPrompt.id)
    createPrompt({
      variables: {
        id: run.id,
        prompt: queuedPrompt.message,
      },
    })
      .then(() =>
        setChatQueue((prev) => prev.filter(({ id }) => id !== queuedPrompt.id))
      )
      .catch(() => undefined)
      .finally(() => {
        queuedPromptInFlightRef.current = null
      })
  })

  useEffect(() => {
    if (isRunning) canDispatchQueuedPromptRef.current = true
  }, [isRunning])

  useEffect(() => {
    sendTopQueuePrompt()
  }, [chatQueue.length, isPromptConsuming, loading, sendTopQueuePrompt])

  const submitPrompt = () => {
    const content = prompt.trim()
    if (!content) return

    if (isRunning || chatQueue.length || loading) {
      enqueuePrompt(content)
      return
    }

    createRunPrompt(content, true)
  }

  return (
    <RepromptInputWrapperSC>
      {error && (
        <GqlError
          error={error}
          margin="small"
        />
      )}
      <div css={{ position: 'relative' }}>
        {!!chatQueue.length && (
          <QueueCardSC>
            <SimpleAccordion
              defaultOpen
              trigger={
                <Body2P $color="text-primary-disabled">{`${chatQueue.length} Queued`}</Body2P>
              }
              caret="right-quarter-mirror"
              triggerWrapperStyles={{
                justifyContent: 'flex-start',
                '.icon': { width: 10 },
              }}
            >
              {chatQueue.map(({ id, message }) => (
                <QueueItemSC key={id}>
                  <CircleDashIcon
                    size={14}
                    color="icon-light"
                  />
                  <Body2P
                    $color="text-light"
                    css={{ ...TRUNCATE, flex: 1 }}
                  >
                    {prettifyPrompt(message)}
                  </Body2P>
                  <IconFrame
                    clickable
                    size="small"
                    tooltip="Remove"
                    icon={<TrashCanIcon color="icon-danger" />}
                    onClick={() =>
                      setChatQueue(chatQueue.filter((m) => m.id !== id))
                    }
                  />
                </QueueItemSC>
              ))}
            </SimpleAccordion>
          </QueueCardSC>
        )}
        <ChatInputSimple
          ref={inputRef}
          bgColor="fill-zero-selected"
          placeholder={agentRunRepromptPlaceholder(run.status)}
          setValue={setPrompt}
          onSubmit={submitPrompt}
          loading={loading}
          allowSubmit={!!prompt.trim()}
          wrapperStyles={{ minHeight: 112 }}
        />
      </div>
    </RepromptInputWrapperSC>
  )
}

function AgentRunStatusCallout({
  run,
  isApprovable,
  approving,
  onApprove,
  onViewDiff,
}: {
  run: AgentRunFragment
  isApprovable: boolean
  approving: boolean
  onApprove: () => void
  onViewDiff: () => void
}) {
  const theme = useTheme()
  const pullRequest = run.pullRequests?.[0]
  const title = pullRequest?.title ?? agentRunStatusTitle(run.status)
  const summary = run.analysis?.summary
  const hasPatch = !!run.upload?.patch
  const workbenchJob = run.workbenchJob
  const workbench = workbenchJob?.workbench
  const showWorkbenchChip =
    !!workbenchJob?.id && !!workbench?.id && !!workbench.name

  return (
    <Card
      fillLevel={1}
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        marginBottom: theme.spacing.small,
        marginTop: theme.spacing.small,
        padding: theme.spacing.medium,
        width: '100%',
        borderLeft: `3px solid ${theme.colors[statusToBorderColor[run.status]]}`,
      }}
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
      {(hasPatch || pullRequest?.url || isApprovable || showWorkbenchChip) && (
        <StretchedFlex
          align="center"
          gap="small"
        >
          {showWorkbenchChip && (
            <WorkbenchLinkChip
              workbenchId={workbench.id}
              workbenchName={workbench.name}
              workbenchJobId={workbenchJob.id}
              css={{ flexShrink: 0 }}
            />
          )}
          {(hasPatch || pullRequest?.url || isApprovable) && (
            <Flex
              gap="small"
              css={{ marginLeft: 'auto' }}
            >
              {hasPatch ? (
                <Button
                  small
                  secondary
                  onClick={onViewDiff}
                >
                  View diff
                </Button>
              ) : (
                pullRequest?.url && (
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
                )
              )}
              {isApprovable && (
                <Button
                  small
                  onClick={onApprove}
                  loading={approving}
                >
                  Approve & create PR
                </Button>
              )}
            </Flex>
          )}
        </StretchedFlex>
      )}
    </Card>
  )
}

function agentRunRepromptPlaceholder(status: AgentRunStatus) {
  switch (status) {
    case AgentRunStatus.Running:
      return 'Send an additional message to this agent run.'
    case AgentRunStatus.Babysitting:
      return 'Ask the agent to follow up on the draft PR.'
    case AgentRunStatus.PendingApproval:
      return 'Have revisions to PR draft? Ask the agent here before you approve.'
    default:
      return 'Send an additional message to this agent run.'
  }
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

const RepromptInputWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  paddingTop: theme.spacing.medium,
}))

const QueueItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  paddingTop: theme.spacing.xsmall,
}))

const QueueCardSC = styled(Card)(({ theme }) => ({
  position: 'absolute',
  bottom: '100%',
  left: theme.spacing.medium,
  right: theme.spacing.medium,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  border: theme.borders['fill-three'],
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderBottom: 'none',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
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
