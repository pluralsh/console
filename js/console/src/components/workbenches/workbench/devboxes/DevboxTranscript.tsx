import {
  Chip,
  Code,
  FailedFilledIcon,
  Flex,
  LinkoutIcon,
} from '@pluralsh/design-system'
import {
  agentRunUserMsgStyle,
  chatMessagePropsShared,
} from 'components/ai/agent-runs/details/AIAgentRunMessages'
import { AgentTodosTimeline } from 'components/ai/common/AgentTodosTimeline'
import { ChatMarkdown } from 'components/ai/chatbot/ChatMarkdown'
import { withSlashCommandChip } from 'components/ai/chatbot/DevboxFileChip'
import { ChatMessage } from 'components/ai/chatbot/ChatMessage'
import {
  SimpleAccordion,
  SimpleToolCall,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import {
  isCmdToolKind,
  resolveToolCallKind,
  toolCallGroupHeader,
} from 'components/ai/chatbot/toolCallDisplay'
import { useQuietToolCodeCss } from 'components/ai/chatbot/ToolCallContent'
import { EaseIn } from 'components/utils/EaseIn'
import { Body2P, shimmerWithinCss } from 'components/utils/typography/Text'
import {
  AiRole,
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxThreadFragment,
  DevboxToolCallFragment,
} from 'generated/graphql'
import {
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import { ReactNode, use, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { isFileEditToolCall, toolCallDiffs } from './devboxApprovals'
import { DevboxFileDiff } from './DevboxFileDiff'
import { McpToolIndexContext, toolIntegration } from './devboxIntegrations'
import { DevboxContentBlock, DevboxToolCallContent } from './devboxTimeline'
import { subagentsBySpawner } from './devboxSubagentState'

type TerminalLookup = (
  terminalId: Nullable<string>
) => Nullable<DevboxEntityFragment['terminal']>

type TranscriptRow =
  | { kind: 'entity'; entity: DevboxEntityFragment }
  | { kind: 'tools'; entities: DevboxEntityFragment[] }
  | { kind: 'approval'; entity: DevboxEntityFragment; approval: ReactNode }
  | {
      kind: 'subagent'
      subagent: DevboxThreadFragment
      spawner?: DevboxEntityFragment
    }

// the tool calls whose approvals, and the subagents whose cards, a transcript shows
export type TranscriptPlacement = {
  approvals: ReadonlySet<string>
  subagents: ReadonlySet<string>
}

export function DevboxTranscript({
  entities,
  terminal = () => null,
  approvalFor,
  subagents = [],
  renderSubagent,
  complete = true,
  running = false,
  empty,
  renderUnplaced,
}: {
  entities: DevboxEntityFragment[]
  terminal?: TerminalLookup
  // whether the thread's turn is in progress: its newest entity, if a
  // thought, is still being thought
  running?: boolean
  // whether every page of the transcript is loaded: until then, a subagent
  // nothing loaded spawned may belong to a page still to come
  complete?: boolean
  // the approval a tool call awaits, answered under it; such a call stays out
  // of tool groups so it can't be collapsed away
  approvalFor?: (toolCallId: string) => ReactNode
  subagents?: DevboxThreadFragment[]
  // a subagent's row, in place of the tool call or message that spawned it
  renderSubagent?: (
    subagent: DevboxThreadFragment,
    spawner?: DevboxEntityFragment
  ) => ReactNode
  empty?: ReactNode
  // what follows the transcript, given what it placed: anything awaiting an
  // answer that found no place in it still needs to be shown
  renderUnplaced?: (placed: TranscriptPlacement) => ReactNode
}) {
  const embeddedTerminals = new Set(
    entities.flatMap((e) =>
      (e.toolCall?.content ?? [])
        .filter(isNonNullable)
        .flatMap((c) =>
          c.__typename === 'DevboxToolCallTerminal' && c.terminalId
            ? [c.terminalId]
            : []
        )
    )
  )
  const bySession = new Map(subagents.map((s) => [s.sessionId, s]))
  const bySpawner = subagentsBySpawner(subagents)
  const placed = new Set<string>()
  const placedApprovals = new Set<string>()

  // consecutive tool calls collapse into one group, as in agent run transcripts
  const rows: TranscriptRow[] = []
  for (const entity of entities) {
    if (
      entity.type === DevboxEntityType.Terminal &&
      entity.terminal?.terminalId &&
      embeddedTerminals.has(entity.terminal.terminalId)
    )
      continue
    const toolCallId = entity.toolCall?.toolCallId
    const approval =
      entity.type === DevboxEntityType.ToolCall && toolCallId
        ? approvalFor?.(toolCallId)
        : null
    if (approval && toolCallId) {
      placedApprovals.add(toolCallId)
      rows.push({ kind: 'approval', entity, approval })
    }
    const spawned = (
      toolCallId ? bySpawner.get(toolCallId) : undefined
    )?.filter((s) => !placed.has(s.id))
    if (spawned?.length && renderSubagent) {
      for (const subagent of spawned) {
        placed.add(subagent.id)
        rows.push({ kind: 'subagent', subagent, spawner: entity })
      }
      continue
    }
    if (approval) continue

    // the first message to or from a subagent is where it starts: its card stands in for it, and the subagent's
    // own transcript opens with the task
    const linked =
      entity.type === DevboxEntityType.SessionMessage
        ? [
            entity.sessionMessage?.toSessionId,
            entity.sessionMessage?.fromSessionId,
          ]
            .map((id) => (id ? bySession.get(id) : undefined))
            .find((s) => s && !placed.has(s.id))
        : undefined
    if (linked && renderSubagent) {
      placed.add(linked.id)
      rows.push({ kind: 'subagent', subagent: linked, spawner: entity })
      continue
    }

    const last = rows.at(-1)
    if (isGroupableToolCall(entity)) {
      if (last?.kind === 'tools') last.entities.push(entity)
      else rows.push({ kind: 'tools', entities: [entity] })
    } else rows.push({ kind: 'entity', entity })
  }
  if (renderSubagent && complete)
    for (const subagent of subagents)
      if (!placed.has(subagent.id)) rows.push({ kind: 'subagent', subagent })

  const rest = renderUnplaced?.({
    approvals: placedApprovals,
    subagents: placed,
  })
  if (!rows.length)
    return (
      <>
        {empty}
        {rest}
      </>
    )
  return (
    <>
      <TranscriptSC>
        {rows.map((row) => {
          switch (row.kind) {
            case 'subagent':
              return (
                <div
                  key={`subagent:${row.subagent.id}`}
                  data-entity="subagent"
                >
                  {renderSubagent?.(row.subagent, row.spawner)}
                </div>
              )
            case 'approval':
              return (
                <Flex
                  key={`approval:${row.entity.id}`}
                  direction="column"
                  gap="small"
                  data-position={row.entity.position ?? undefined}
                >
                  <ToolCallView
                    entity={row.entity}
                    terminal={terminal}
                  />
                  {row.approval}
                </Flex>
              )
            case 'tools': {
              const [first] = row.entities
              return (
                <div
                  key={`tools:${first.id}`}
                  data-position={first.position ?? undefined}
                >
                  {row.entities.length === 1 ? (
                    <ToolCallView
                      entity={first}
                      terminal={terminal}
                    />
                  ) : (
                    <ToolCallGroup
                      entities={row.entities}
                      terminal={terminal}
                    />
                  )}
                </div>
              )
            }
            default:
              return (
                <div
                  key={`${row.entity.type}:${row.entity.id}`}
                  data-position={row.entity.position ?? undefined}
                >
                  <DevboxEntityView
                    entity={row.entity}
                    terminal={terminal}
                    streaming={running && row.entity === entities.at(-1)}
                  />
                </div>
              )
          }
        })}
      </TranscriptSC>
      {rest}
    </>
  )
}

export function DevboxEntityView({
  entity,
  terminal = () => null,
  streaming = false,
}: {
  entity: DevboxEntityFragment
  terminal?: TerminalLookup
  // still being written: the newest entity of a turn in progress
  streaming?: boolean
}) {
  switch (entity.type) {
    case DevboxEntityType.UserMessage:
      if (!entity.message) break
      return (
        <MessageView
          role={AiRole.User}
          blocks={entity.message.content}
          data-entity="user-message"
        />
      )
    case DevboxEntityType.AgentMessage:
      if (!entity.message) break
      return (
        <MessageView
          role={AiRole.Assistant}
          blocks={entity.message.content}
          data-entity="agent-message"
        />
      )
    case DevboxEntityType.AgentThought:
      if (!entity.message) break
      return (
        <ThoughtSC
          data-entity="agent-thought"
          data-streaming={streaming || undefined}
          $streaming={streaming}
        >
          <AccordionSection
            label={
              streaming ? (
                <Body2P
                  as="span"
                  $color="text-xlight"
                  $shimmer
                >
                  Thinking
                </Body2P>
              ) : (
                <Body2P
                  as="span"
                  $color="text-light"
                >
                  Thought{' '}
                  <Body2P
                    as="span"
                    $color="text-xlight"
                  >
                    {thoughtDuration(entity)}
                  </Body2P>
                </Body2P>
              )
            }
          >
            <SimplifiedMarkdown
              text={blocksText(entity.message.content)}
              tone="faint"
            />
          </AccordionSection>
        </ThoughtSC>
      )
    case DevboxEntityType.ToolCall:
      if (!entity.toolCall) break
      return (
        <ToolCallView
          entity={entity}
          terminal={terminal}
        />
      )
    case DevboxEntityType.Plan:
      if (!entity.plan) break
      return <PlanView plan={entity.plan} />
    case DevboxEntityType.Terminal:
      if (!entity.terminal) break
      return <TerminalView terminal={entity.terminal} />
    case DevboxEntityType.Compaction:
      if (!entity.compaction) break
      return (
        <div data-entity="compaction">
          <AccordionSection
            label={`Context compacted${entity.compaction.status ? ` · ${entity.compaction.status}` : ''}`}
          >
            <SimplifiedMarkdown
              text={blocksText(entity.compaction.summary)}
              tone="meta"
            />
          </AccordionSection>
        </div>
      )
    case DevboxEntityType.SessionMessage:
      if (!entity.sessionMessage) break
      return (
        <div data-entity="session-message">
          <AccordionSection label="Message between sessions">
            <SimplifiedMarkdown
              text={blocksText(entity.sessionMessage.content)}
              tone="thought"
            />
          </AccordionSection>
        </div>
      )
    default:
      break
  }
  return (
    <GenericCard
      label={`${entity.type ?? 'Unknown'} entity`}
      raw={entity.raw}
    />
  )
}

function MessageView({
  role,
  blocks,
  'data-entity': dataEntity,
}: {
  role: AiRole
  blocks: Nullable<Nullable<DevboxContentBlock>[]>
  'data-entity': string
}) {
  const theme = useTheme()
  const list = (blocks ?? []).filter(isNonNullable)
  const raw = blocksText(list)
  const text = role === AiRole.User ? withSlashCommandChip(raw) : raw
  const rich = list.filter((b) => b.__typename !== 'DevboxTextContent')
  return (
    <Flex
      direction="column"
      gap="small"
      align={role === AiRole.User ? 'flex-end' : 'flex-start'}
      data-entity={dataEntity}
    >
      {text && (
        <ChatMessage
          role={role}
          content={text}
          {...chatMessagePropsShared}
          userMsgWrapperStyle={agentRunUserMsgStyle(theme)}
        />
      )}
      {rich.map((block, i) => (
        <ContentBlockView
          key={i}
          block={block}
        />
      ))}
    </Flex>
  )
}

export function ContentBlockView({ block }: { block: DevboxContentBlock }) {
  switch (block.__typename) {
    case 'DevboxTextContent':
      return <ChatMarkdown text={block.text ?? ''} />
    case 'DevboxImageContent':
      return (
        <ImageSC
          alt=""
          src={
            block.data
              ? `data:${block.mimeType ?? 'image/png'};base64,${block.data}`
              : (block.uri ?? undefined)
          }
        />
      )
    case 'DevboxAudioContent':
      return block.data ? (
        <audio
          controls
          src={`data:${block.mimeType ?? 'audio/wav'};base64,${block.data}`}
        />
      ) : null
    case 'DevboxResourceContent':
      return block.text != null ? (
        <Code
          title={block.uri ?? undefined}
          language={languageFor(block.uri, block.mimeType)}
        >
          {block.text}
        </Code>
      ) : (
        <Chip size="small">
          {block.uri ?? 'Embedded resource'}
          {block.mimeType ? ` · ${block.mimeType}` : ''}
        </Chip>
      )
    case 'DevboxResourceLinkContent':
      return (
        <Chip
          size="small"
          clickable={!!block.uri && /^https?:/.test(block.uri)}
          as={block.uri && /^https?:/.test(block.uri) ? 'a' : undefined}
          {...(block.uri && /^https?:/.test(block.uri)
            ? { href: block.uri, target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          icon={<LinkoutIcon />}
          tooltip={block.description ?? undefined}
        >
          {block.title || block.name || block.uri}
        </Chip>
      )
    case 'DevboxUnknownContent':
      return (
        <GenericCard
          label={`${block.variant ?? 'Unknown'} content`}
          raw={block.raw}
        />
      )
    default:
      break
  }
  return (
    <GenericCard
      label={`${(block as { type?: string }).type ?? 'Unknown'} content`}
      raw={block}
    />
  )
}

// Codex's guardian reports each auto-review as a tool call with this id prefix; its status is the verdict.
const GUARDIAN_REVIEW_PREFIX = 'guardian_assessment:'

const GUARDIAN_REVIEW_TITLE: Record<string, string> = {
  pending: 'Codex reviewer is checking',
  in_progress: 'Codex reviewer is checking',
  completed: 'Approved by Codex reviewer',
  failed: 'Not approved by Codex reviewer',
}

// ACP tool kinds, as the tool names the shared tool call display understands
const ACP_TOOL_NAMES: Record<string, string> = {
  execute: 'bash',
  read: 'read',
  edit: 'edit',
  delete: 'edit',
  move: 'edit',
  search: 'grep',
  fetch: 'web_fetch',
  think: 'think',
}

function toolStatus(entity: DevboxEntityFragment) {
  return `${entity.toolCall?.status ?? (entity.settled ? 'completed' : 'pending')}`
}

const isPendingStatus = (status: string) =>
  status === 'pending' || status === 'in_progress'

export function toolIdentity(toolCall: DevboxToolCallFragment) {
  const raw = toolCall.rawInput
  const input: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {}
  const kind = `${toolCall.kind ?? ''}`
  const name = ACP_TOOL_NAMES[kind] || toolCall.title || kind || 'tool'
  if (kind === 'execute' && typeof input.command !== 'string')
    input.command = Array.isArray(input.command)
      ? input.command.join(' ')
      : (toolCall.title ?? '').replace(/^`|`$/g, '')
  const location = toolCall.locations?.find(isNonNullable)?.path
  const path = input.file_path ?? input.notebook_path ?? location
  if (input.path == null && typeof path === 'string') input.path = path
  return { name, arguments: input }
}

function isGroupableToolCall(entity: DevboxEntityFragment) {
  if (
    entity.type !== DevboxEntityType.ToolCall ||
    !entity.toolCall ||
    entity.toolCall.toolCallId?.startsWith(GUARDIAN_REVIEW_PREFIX)
  )
    return false
  // edits stay in the stream so their diffs can be read without expanding a rollup
  if (isFileEditToolCall(entity.toolCall)) return false
  const { name, arguments: args } = toolIdentity(entity.toolCall)
  return !isCmdToolKind(resolveToolCallKind(name, args))
}

function toolOutput(
  toolCall: DevboxToolCallFragment,
  content: DevboxToolCallContent[],
  terminal: TerminalLookup
) {
  const parts = content.flatMap((c) => {
    if (c.__typename === 'DevboxToolCallTerminal')
      return [terminal(c.terminalId)?.output ?? '']
    if (
      c.__typename === 'DevboxToolCallBlock' &&
      c.content?.__typename === 'DevboxTextContent'
    )
      return [c.content.text ?? '']
    return []
  })
  const text = parts.filter(Boolean).join('\n')
  if (text || toolCall.rawOutput == null) return text
  return typeof toolCall.rawOutput === 'string'
    ? toolCall.rawOutput
    : safeJson(toolCall.rawOutput)
}

function ToolCallGroup({
  entities,
  terminal,
}: {
  entities: DevboxEntityFragment[]
  terminal: TerminalLookup
}) {
  const { spacing } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const last = entities.at(-1)
  const header = toolCallGroupHeader(
    entities.flatMap((e) => (e.toolCall ? [toolIdentity(e.toolCall)] : []))
  )
  return (
    <>
      <SimpleAccordion
        label={header}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        hoverCaret
      >
        <Flex
          direction="column"
          gap="small"
          marginTop={spacing.xsmall}
        >
          {entities.map((entity) => (
            <ToolCallView
              key={entity.id}
              entity={entity}
              terminal={terminal}
            />
          ))}
        </Flex>
      </SimpleAccordion>
      {!isOpen && last && isPendingStatus(toolStatus(last)) && (
        <EaseIn currentKey={last.id ?? ''}>
          <ToolCallView
            entity={last}
            terminal={terminal}
          />
        </EaseIn>
      )}
    </>
  )
}

function ToolCallView({
  entity,
  terminal,
}: {
  entity: DevboxEntityFragment
  terminal: TerminalLookup
}) {
  const { spacing } = useTheme()
  const mcpTools = use(McpToolIndexContext)
  const toolCall = entity.toolCall
  if (!toolCall) return null
  const content = (toolCall.content ?? []).filter(isNonNullable)
  const status = toolStatus(entity)
  const review = toolCall.toolCallId?.startsWith(GUARDIAN_REVIEW_PREFIX)
  const identity = toolIdentity(toolCall)
  const kind = resolveToolCallKind(identity.name, identity.arguments)
  const output = toolOutput(toolCall, content, terminal)
  const rich = content.filter(
    (c) =>
      c.__typename !== 'DevboxToolCallTerminal' &&
      !(
        c.__typename === 'DevboxToolCallBlock' &&
        c.content?.__typename === 'DevboxTextContent'
      )
  )
  const integration = review ? null : toolIntegration(toolCall, mcpTools)
  const integrationIcon = integration && (
    <WorkbenchToolIcon
      type={integration.type}
      provider={integration.provider}
      size={14}
      css={{ flexShrink: 0 }}
    />
  )
  const integrationTitle =
    integration?.action != null
      ? (getWorkbenchToolLabel(integration.type, integration.provider) ??
        integration.workbenchToolName)
      : undefined
  const diffs =
    !review && isFileEditToolCall(toolCall) ? toolCallDiffs(toolCall) : []
  if (diffs.length)
    return (
      <Flex
        direction="column"
        gap="xsmall"
        data-entity="tool-call"
      >
        {diffs.map((diff, i) => (
          <DevboxFileDiff
            key={i}
            diff={diff}
            status={<EditStatus status={status} />}
          />
        ))}
        {status === 'failed' && output && (
          <SimplifiedMarkdown
            text={output}
            tone="meta"
          />
        )}
      </Flex>
    )
  // edit rows use their content as the subtitle; keep it to the path
  const edit = kind === 'edit'
  return (
    <div data-entity="tool-call">
      <SimpleToolCall
        content={edit ? '' : output}
        attributes={{ tool: identity }}
        isPending={isPendingStatus(status)}
        standaloneCommand={isCmdToolKind(kind)}
        customTitle={
          review
            ? GUARDIAN_REVIEW_TITLE[status]
            : (integrationTitle ??
              (kind === 'generic' ? (toolCall.title ?? undefined) : undefined))
        }
        customSubtitle={integrationTitle ? integration?.action : undefined}
        leadingIcon={
          status === 'failed' ? (
            <FailedFilledIcon
              size={12}
              color="icon-danger"
            />
          ) : (
            (integrationIcon ?? undefined)
          )
        }
        commandIcon={integrationIcon ?? undefined}
        customResultBody={
          rich.length || (edit && output) ? (
            <Flex
              direction="column"
              gap="small"
              marginTop={spacing.xsmall}
            >
              {output && (
                <SimplifiedMarkdown
                  text={output}
                  tone="meta"
                />
              )}
              {rich.map((c, i) => (
                <ToolCallContentView
                  key={i}
                  content={c}
                />
              ))}
            </Flex>
          ) : undefined
        }
      />
    </div>
  )
}

function EditStatus({ status }: { status: string }) {
  if (status === 'failed')
    return (
      <Chip
        size="small"
        severity="danger"
      >
        Failed
      </Chip>
    )
  if (isPendingStatus(status))
    return (
      <Chip
        size="small"
        loading
      >
        Editing
      </Chip>
    )
  return null
}

function ToolCallContentView({ content }: { content: DevboxToolCallContent }) {
  switch (content.__typename) {
    case 'DevboxToolCallBlock':
      return content.content ? (
        <ContentBlockView block={content.content} />
      ) : null
    case 'DevboxToolCallDiff':
      return (
        <DevboxFileDiff
          diff={{
            path: content.path ?? '',
            oldText: content.oldText ?? '',
            newText: content.newText ?? '',
          }}
        />
      )
    case 'DevboxToolCallUnknown':
      return (
        <GenericCard
          label={`${content.variant ?? 'Unknown'} tool content`}
          raw={content.raw}
        />
      )
    default:
      break
  }
  return (
    <GenericCard
      label="Tool content"
      raw={content}
    />
  )
}

function TerminalView({
  terminal,
}: {
  terminal: NonNullable<DevboxEntityFragment['terminal']>
}) {
  const command = [terminal.command, ...(terminal.args ?? [])]
    .filter(Boolean)
    .join(' ')
  const exited = terminal.exitCode != null || terminal.signal != null
  return (
    <div data-entity="terminal">
      <SimpleToolCall
        content={`${terminal.truncated ? '…\n' : ''}${terminal.output ?? ''}`}
        attributes={{
          tool: {
            name: 'bash',
            arguments: { command: command || terminal.terminalId },
          },
        }}
        isPending={!exited}
        standaloneCommand
      />
    </div>
  )
}

function PlanView({
  plan,
}: {
  plan: NonNullable<DevboxEntityFragment['plan']>
}) {
  const entries = (plan.entries ?? []).filter(isNonNullable)
  const done = entries.filter((e) => e.status === 'completed').length
  return (
    <div data-entity="plan">
      <AccordionSection
        label={`Plan · ${done}/${entries.length}`}
        defaultOpen
      >
        <AgentTodosTimeline
          todos={entries.map((entry) => ({
            title: entry.content ?? '',
            description: '',
            done: entry.status === 'completed',
          }))}
        />
      </AccordionSection>
    </div>
  )
}

// thinking shorter than this reads as "briefly" rather than a count of seconds
const BRIEF_THOUGHT_MS = 2000

// how long a finished thought took, from its first chunk to its last
export function thoughtDuration({
  createdAt,
  updatedAt,
}: Pick<DevboxEntityFragment, 'createdAt' | 'updatedAt'>) {
  const ms = Date.parse(updatedAt ?? '') - Date.parse(createdAt ?? '')
  if (Number.isNaN(ms)) return null
  if (ms < BRIEF_THOUGHT_MS) return 'briefly'
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  const rem = secs % 60
  return rem ? `${Math.floor(secs / 60)}m ${rem}s` : `${secs / 60}m`
}

const ThoughtSC = styled.div<{ $streaming: boolean }>(
  ({ theme, $streaming }) => ($streaming ? shimmerWithinCss(theme) : {})
)

function AccordionSection({
  label,
  defaultOpen,
  children,
}: {
  label: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const { spacing } = useTheme()
  return (
    <SimpleAccordion
      label={label}
      defaultOpen={defaultOpen}
      hoverCaret
    >
      <Flex
        direction="column"
        marginTop={spacing.xsmall}
        minWidth={0}
      >
        {children}
      </Flex>
    </SimpleAccordion>
  )
}

export function GenericCard({ label, raw }: { label: string; raw: unknown }) {
  const quietCodeCss = useQuietToolCodeCss()
  return (
    <Flex
      direction="column"
      gap="xxsmall"
      data-entity="generic"
    >
      <Body2P $color="text-xlight">{label}</Body2P>
      {raw != null && (
        <Code
          language="json"
          showHeader={false}
          fillLevel={0}
          css={quietCodeCss}
        >
          {safeJson(raw)}
        </Code>
      )}
    </Flex>
  )
}

function blocksText(blocks: Nullable<Nullable<DevboxContentBlock>[]>) {
  return (blocks ?? [])
    .filter(isNonNullable)
    .flatMap((b) =>
      b.__typename === 'DevboxTextContent' && b.text ? [b.text] : []
    )
    .join('\n\n')
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function languageFor(uri: Nullable<string>, mimeType: Nullable<string>) {
  const ext = uri?.split('.').pop()?.toLowerCase()
  if (ext && ext.length <= 5) return ext
  return mimeType?.split('/').pop() ?? 'text'
}

const TranscriptSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

const ImageSC = styled.img(({ theme }) => ({
  maxWidth: '100%',
  borderRadius: theme.borderRadiuses.medium,
}))
