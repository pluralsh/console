import { Button, Callout, Flex, ListBoxItem } from '@pluralsh/design-system'
import { DevboxFileOpenContext } from 'components/ai/chatbot/DevboxFileChip'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxInstanceFragment,
  DevboxInteractionState,
  DevboxThreadFragment,
  DevboxThreadKind,
  DevboxThreadStatus,
  DevboxToolCallFragment,
  DevboxForegroundState,
  useCancelDevboxPromptMutation,
  useDevboxInstanceCommandsQuery,
  usePromptDevboxThreadMutation,
  useRespondDevboxInteractionMutation,
  useSetDevboxThreadConfigOptionMutation,
} from 'generated/graphql'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  AI_SUBSCRIPTIONS_ABS_PATH,
  useSwitchToProxy,
} from './devboxCredentials'
import { findToolCall } from './devboxApprovals'
import { useFollowBottom } from './useFollowBottom'
import { DevboxAgentIcon, DevboxAgentLabel } from './DevboxChips'
import { DevboxComposer } from './DevboxComposer'
import { useDevboxPanel } from './DevboxControlPanel'
import { describeThreadError } from './devboxErrors'
import { isInstanceLive, isInstanceTerminal } from './devboxIdle'
import { DevboxInteractionCard } from './DevboxInteractionCard'
import { PillSelect } from './DevboxPromptPills'
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
  const subagents = (instance.threads ?? [])
    .filter(isNonNullable)
    .filter(
      (t) => t.kind === DevboxThreadKind.Subagent && t.parent?.id === thread.id
    )
  const threadIds = new Set([thread.id, ...subagents.map((s) => s.id)])
  const interactions = (instance.interactions ?? [])
    .filter(isNonNullable)
    .filter((i) => i.thread?.id && threadIds.has(i.thread.id))
  // a pending approval card previews its tool call, so the transcript leaves that call out until it's answered
  const awaitingToolCalls = new Set(
    interactions.flatMap((i) =>
      i.state === DevboxInteractionState.Pending && i.toolCallId
        ? [i.toolCallId]
        : []
    )
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
  const { listFiles } = useDevboxWorkspaceApi(live ? instance.id : null)

  const sessionError = sessionId ? timeline.errors[sessionId] : undefined
  const { openFile } = useDevboxPanel()

  return (
    <PaneSC>
      <DevboxFileOpenContext value={live ? openFile : null}>
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
              hiddenToolCalls={awaitingToolCalls}
              subagents={subagents}
              renderSubagentLane={(s) => (
                <SubagentTranscript
                  subagent={s}
                  timeline={timeline}
                  ended={ended}
                  hiddenToolCalls={awaitingToolCalls}
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
            {interactions.map((interaction) => (
              <InteractionWithMutation
                key={interaction.id}
                interaction={interaction}
                toolCall={findToolCall(timeline.store, interaction.toolCallId)}
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
      )}
    </PaneSC>
  )
}

function SubagentTranscript({
  subagent,
  timeline,
  ended,
  hiddenToolCalls,
}: {
  subagent: DevboxThreadFragment
  timeline: DevboxTimelineStoreApi
  ended: boolean
  hiddenToolCalls: ReadonlySet<string>
}) {
  const session = subagent.sessionId
    ? timeline.store.sessions[subagent.sessionId]
    : undefined
  const { ensureSession } = timeline
  useEffect(() => {
    if (!ended) ensureSession(subagent.sessionId)
  }, [ended, ensureSession, subagent.sessionId])
  return (
    <DevboxTranscript
      entities={selectOrderedEntities(session)}
      terminal={(id) => selectTerminalOutput(session, id)}
      hiddenToolCalls={hiddenToolCalls}
      empty={
        <CaptionP $color="text-xlight">
          {ended
            ? 'Not available.'
            : session?.loaded
              ? 'No activity yet.'
              : 'Loading…'}
        </CaptionP>
      }
    />
  )
}

function InteractionWithMutation({
  interaction,
  toolCall,
}: {
  interaction: NonNullable<DevboxInstanceFragment['interactions']>[number] & {}
  toolCall: Nullable<DevboxToolCallFragment>
}) {
  const [respond, { loading, error }] = useRespondDevboxInteractionMutation()
  return (
    <DevboxInteractionCard
      interaction={interaction}
      toolCall={toolCall}
      loading={loading}
      error={error && <GqlError error={error} />}
      onRespond={(response) =>
        respond({ variables: { id: interaction.id, response } })
      }
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
