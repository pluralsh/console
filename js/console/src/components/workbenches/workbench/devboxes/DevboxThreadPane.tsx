import {
  Button,
  Callout,
  Flex,
  IconFrame,
  ListBoxItem,
  ReturnIcon,
} from '@pluralsh/design-system'
import { DevboxFileOpenContext } from 'components/ai/chatbot/DevboxFileChip'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxInstanceFragment,
  DevboxInteractionFragment,
  DevboxInteractionKind,
  DevboxInteractionState,
  DevboxThreadFragment,
  DevboxThreadKind,
  DevboxThreadStatus,
  DevboxToolCallFragment,
  DevboxForegroundState,
  useCancelDevboxPromptMutation,
  useDevboxInstanceCommandsQuery,
  usePromptDevboxThreadMutation,
  useSetDevboxThreadConfigOptionMutation,
} from 'generated/graphql'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  WORKBENCH_DEVBOX_POSITION_QUERY_PARAM,
  WORKBENCH_DEVBOX_THREAD_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  AI_SUBSCRIPTIONS_ABS_PATH,
  useSwitchToProxy,
} from './devboxCredentials'
import { attributeInteractions, findToolCall } from './devboxApprovals'
import { useFollowBottom } from './useFollowBottom'
import { DevboxAgentIcon, DevboxAgentLabel } from './DevboxChips'
import { DevboxComposer } from './DevboxComposer'
import { useDevboxPanel } from './DevboxControlPanel'
import { describeThreadError } from './devboxErrors'
import { isInstanceLive, isInstanceTerminal } from './devboxIdle'
import {
  DevboxInlineApproval,
  DevboxInteraction,
  isInlineApproval,
} from './DevboxInteractionCard'
import { PillSelect } from './DevboxPromptPills'
import { DevboxQueuedPrompts } from './DevboxQueuedPrompts'
import { DevboxSubagentActivity } from './DevboxSubagents'
import {
  latestToolCall,
  subagentState,
  subagentSummary,
} from './devboxSubagentState'
import { threadTitle } from './devboxThreads'
import { agentLabel, findAgent, isProxyBilled } from './devboxStartForm'
import { selectOrderedEntities, selectTerminalOutput } from './devboxTimeline'
import { DevboxTranscript } from './DevboxTranscript'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'
import { DevboxTimelineStoreApi } from './useDevboxTimeline'

export function DevboxThreadPane({
  instance,
  thread,
  timeline,
  position,
}: {
  instance: DevboxInstanceFragment
  thread: DevboxThreadFragment
  timeline: DevboxTimelineStoreApi
  position?: Nullable<number>
}) {
  const live = isInstanceLive(instance.status)
  // an ended instance's actor is deleted, and its transcript with it
  const ended = isInstanceTerminal(instance.status)
  const sessionId = thread.sessionId
  const session = sessionId ? timeline.store.sessions[sessionId] : undefined
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrolledTo, setScrolledTo] = useState<Nullable<number>>(null)
  // a deep link holds its position instead of following the stream
  const followBottom = useFollowBottom(scrollRef, contentRef, {
    enabled: !!session?.loaded,
    initiallyPinned: position == null,
  })

  const { ensureSession } = timeline
  useEffect(() => {
    if (!ended) ensureSession(sessionId)
  }, [ended, ensureSession, sessionId])

  const entities = selectOrderedEntities(session)
  const threads = (instance.threads ?? []).filter(isNonNullable)
  const subagents = threads.filter(
    (t) => t.kind === DevboxThreadKind.Subagent && t.parent?.id === thread.id
  )
  const parent = thread.parent?.id
    ? threads.find((t) => t.id === thread.parent?.id)
    : undefined
  const threadIds = new Set([thread.id, ...subagents.map((s) => s.id)])
  const interactions = attributeInteractions(
    (instance.interactions ?? []).filter(isNonNullable),
    threads,
    timeline.store
  ).filter((i) => i.thread?.id && threadIds.has(i.thread.id))
  // a permission request is answered under its tool call, and a subagent's
  // under its row; a card is left for questions (forms, links) and for requests
  // whose call isn't in the loaded transcript
  const transcriptCalls = new Set(
    entities.flatMap((e) =>
      e.type === DevboxEntityType.ToolCall && e.toolCall?.toolCallId
        ? [e.toolCall.toolCallId]
        : []
    )
  )
  const inlineApprovals = new Map(
    interactions
      .filter(
        (i) =>
          i.thread?.id === thread.id &&
          isInlineApproval(i) &&
          !!i.toolCallId &&
          transcriptCalls.has(i.toolCallId)
      )
      .map((i) => [i.toolCallId ?? '', i])
  )
  const ownInteractions = interactions.filter(
    (i) =>
      i.thread?.id === thread.id &&
      !(i.toolCallId && inlineApprovals.has(i.toolCallId)) &&
      (i.kind !== DevboxInteractionKind.Permission ||
        i.state === DevboxInteractionState.Pending)
  )
  const toolCall = (id: Nullable<string>) => findToolCall(timeline.store, id)
  const [, setParams] = useSearchParams()
  const openThread = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM, id)
        next.delete(WORKBENCH_DEVBOX_POSITION_QUERY_PARAM)
        return next
      },
      { replace: true }
    )
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !session?.loaded || position == null || scrolledTo === position)
      return
    const target = el.querySelector(`[data-position="${position}"]`)
    if (target) {
      target.scrollIntoView({ block: 'center' })
      setScrolledTo(position)
    }
  }, [entities.length, position, scrolledTo, session?.loaded])

  const agent = findAgent(instance.devbox, thread.agent)
  const proxyBilled = isProxyBilled(instance, thread.agent)
  const { data: commandsData } = useDevboxInstanceCommandsQuery({
    variables: { threadId: thread.id },
    skip: !live || thread.status === DevboxThreadStatus.Closed,
    fetchPolicy: 'cache-and-network',
  })
  const commands =
    commandsData?.devboxInstanceCommands ??
    thread.availableCommands ??
    agent?.commands

  const [prompt, promptState] = usePromptDevboxThreadMutation()
  const [cancel] = useCancelDevboxPromptMutation()
  const [setOption] = useSetDevboxThreadConfigOptionMutation()
  const closed =
    thread.status === DevboxThreadStatus.Closed ||
    thread.status === DevboxThreadStatus.Deleted
  const subagent = thread.kind === DevboxThreadKind.Subagent
  const { listFiles, searchFiles } = useDevboxWorkspaceApi(
    live ? instance.id : null
  )

  const sessionError = sessionId ? timeline.errors[sessionId] : undefined
  const { openFile } = useDevboxPanel()

  return (
    <PaneSC>
      {subagent && parent && (
        <Flex
          gap="small"
          align="center"
        >
          <IconFrame
            clickable
            type="secondary"
            icon={<ReturnIcon />}
            tooltip={`Back to ${threadTitle(parent)}`}
            onClick={() => openThread(parent.id)}
          />
          <CaptionP $color="text-xlight">
            Subagent of {threadTitle(parent)}
          </CaptionP>
        </Flex>
      )}
      <DevboxFileOpenContext
        value={live ? { openFile, cwd: thread.cwd } : null}
      >
        <ScrollSC ref={scrollRef}>
          <ContentSC ref={contentRef}>
            {sessionError && <GqlError error={sessionError} />}
            {session?.hasMore && sessionId && (
              <Button
                small
                tertiary
                loading={!!timeline.loading[sessionId]}
                onClick={() => timeline.loadOlder(sessionId)}
                css={{ alignSelf: 'center' }}
              >
                Load earlier messages
              </Button>
            )}
            <DevboxTranscript
              entities={entities}
              terminal={(id) => selectTerminalOutput(session, id)}
              approvalFor={(id) => {
                const interaction = inlineApprovals.get(id)
                return interaction ? (
                  <DevboxInlineApproval interaction={interaction} />
                ) : null
              }}
              subagents={subagents}
              complete={!!session?.loaded && !session.hasMore}
              renderSubagent={(s, spawner) => (
                <SubagentCard
                  subagent={s}
                  spawner={spawner}
                  timeline={timeline}
                  ended={ended}
                  interactions={interactions}
                  toolCall={toolCall}
                  onOpen={() => openThread(s.id)}
                />
              )}
              empty={
                <CaptionP $color="text-xlight">
                  {ended
                    ? "This instance has ended, so its transcript isn't available anymore."
                    : session?.loaded || !sessionId
                      ? 'Nothing here yet. Send a prompt to get started.'
                      : 'Loading transcript…'}
                </CaptionP>
              }
            />
            {ownInteractions.map((interaction) => (
              <DevboxInteraction
                key={interaction.id}
                interaction={interaction}
                toolCall={toolCall(interaction.toolCallId)}
              />
            ))}
          </ContentSC>
        </ScrollSC>
      </DevboxFileOpenContext>
      <ThreadErrorBanner
        thread={thread}
        instance={instance}
      />
      {promptState.error && <GqlError error={promptState.error} />}
      {!subagent && (
        <ComposerStackSC>
          <DevboxQueuedPrompts
            thread={thread}
            running={thread.foregroundState === DevboxForegroundState.Running}
          />
          <DevboxComposer
            commands={commands}
            configOptions={thread.configOptions}
            autonomyPolicy={instance.devbox?.autonomy}
            proxyBilled={proxyBilled}
            proxyModels={
              proxyBilled
                ? agent?.models?.filter(isNonNullable).map((m) => m.id)
                : null
            }
            listFiles={listFiles}
            searchFiles={searchFiles}
            toolbar={
              thread.agent && (
                <PillSelect
                  label="Agent"
                  selectedKey={thread.agent}
                  onSelect={() => {}}
                  disabled
                  title={`${agentLabel(thread.agent)}, fixed for this session`}
                  trigger={<DevboxAgentLabel agent={thread.agent} />}
                >
                  <ListBoxItem
                    key={thread.agent}
                    label={agentLabel(thread.agent)}
                    leftContent={<DevboxAgentIcon agent={thread.agent} />}
                  />
                </PillSelect>
              )
            }
            modelSwitchable={agent?.modelSwitchable !== false}
            running={thread.foregroundState === DevboxForegroundState.Running}
            disabled={closed || !live}
            placeholder={
              closed
                ? 'This thread is closed; resume it to continue'
                : !live
                  ? 'Resume the instance to continue'
                  : undefined
            }
            onSubmit={(text, attachments) => {
              followBottom()
              return prompt({
                variables: {
                  id: thread.id,
                  prompt: text || null,
                  ...(attachments.length > 0 ? { attachments } : {}),
                },
              }).then(
                ({ errors }) => !errors?.length,
                () => false
              )
            }}
            onCancel={() => cancel({ variables: { id: thread.id } })}
            onSetConfigOption={(configId, value) =>
              setOption({ variables: { id: thread.id, configId, value } })
            }
          />
        </ComposerStackSC>
      )}
    </PaneSC>
  )
}

// loads the subagent's own session, so its card can say what it's doing
function SubagentCard({
  subagent,
  spawner,
  timeline,
  ended,
  interactions,
  toolCall,
  onOpen,
}: {
  subagent: DevboxThreadFragment
  spawner?: DevboxEntityFragment
  timeline: DevboxTimelineStoreApi
  ended: boolean
  interactions: DevboxInteractionFragment[]
  toolCall: (id: Nullable<string>) => Nullable<DevboxToolCallFragment>
  onOpen: () => void
}) {
  const session = subagent.sessionId
    ? timeline.store.sessions[subagent.sessionId]
    : undefined
  const { ensureSession } = timeline
  useEffect(() => {
    if (!ended) ensureSession(subagent.sessionId)
  }, [ended, ensureSession, subagent.sessionId])
  const entities = selectOrderedEntities(session)
  // its transcript still streaming counts too: async subagents work past the
  // turn that spawned them
  const streaming = entities.some((e) => !e.settled)
  const state = subagentState(subagent, interactions)
  const running = state === 'running' || (state === 'done' && streaming)
  return (
    <DevboxSubagentActivity
      subagent={subagent}
      running={running}
      interactions={interactions}
      summary={subagentSummary(entities, running, spawner)}
      latestTool={running ? latestToolCall(entities) : null}
      toolCall={toolCall}
      onOpen={onOpen}
    />
  )
}

export function ThreadErrorBanner({
  thread,
  instance,
}: {
  thread: DevboxThreadFragment
  instance: DevboxInstanceFragment
}) {
  const { popToast } = useSimpleToast()
  const switchToProxy = useSwitchToProxy()
  const [switching, setSwitching] = useState(false)
  const info = describeThreadError(thread)
  if (!info) return null
  return (
    <Callout
      severity="danger"
      title={info.title}
    >
      <Flex
        direction="column"
        gap="small"
      >
        {info.message && <span>{info.message}</span>}
        {!!info.actions.length && (
          <Flex gap="small">
            {info.actions.includes('switchToProxy') && (
              <Button
                small
                loading={switching}
                disabled={!thread.agent}
                onClick={() => {
                  if (!thread.agent) return
                  setSwitching(true)
                  switchToProxy(instance.id, thread.agent)
                    .then(() =>
                      popToast({
                        content: 'Restarting the agent on the Plural AI proxy',
                        severity: 'success',
                      })
                    )
                    .catch((e) =>
                      popToast({
                        content: (e as Error).message,
                        severity: 'danger',
                      })
                    )
                    .then(() => setSwitching(false))
                }}
              >
                Switch to Plural AI proxy
              </Button>
            )}
            {info.actions.includes('relink') && (
              <Button
                small
                secondary
                as={Link}
                to={AI_SUBSCRIPTIONS_ABS_PATH}
              >
                Relink
              </Button>
            )}
          </Flex>
        )}
      </Flex>
    </Callout>
  )
}

const PaneSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  minHeight: 0,
}))

const ComposerStackSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
})

const ScrollSC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: theme.spacing.small,
}))

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))
