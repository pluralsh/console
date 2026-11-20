import {
  BotIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  Chip,
  ChipSeverity,
  Code,
  DiffViewer,
  Flex,
  LinkoutIcon,
  StatusIpIcon,
  TerminalIcon,
  ToolIcon,
} from '@pluralsh/design-system'
import { ChatMarkdown } from 'components/ai/chatbot/ChatMarkdown'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxThreadFragment,
  DevboxToolCallFragment,
} from 'generated/graphql'
import { ReactNode, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { DevboxContentBlock, DevboxToolCallContent } from './devboxTimeline'
import { threadTitle } from './devboxThreads'

type TerminalLookup = (
  terminalId: Nullable<string>
) => Nullable<DevboxEntityFragment['terminal']>

export function DevboxTranscript({
  entities,
  terminal = () => null,
  subagents = [],
  renderSubagentLane,
  empty,
}: {
  entities: DevboxEntityFragment[]
  terminal?: TerminalLookup
  subagents?: DevboxThreadFragment[]
  renderSubagentLane?: (subagent: DevboxThreadFragment) => ReactNode
  empty?: ReactNode
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
  const placed = new Set<string>()

  const items: ReactNode[] = []
  for (const entity of entities) {
    if (
      entity.type === DevboxEntityType.Terminal &&
      entity.terminal?.terminalId &&
      embeddedTerminals.has(entity.terminal.terminalId)
    )
      continue
    items.push(
      <div
        key={`${entity.type}:${entity.id}`}
        data-position={entity.position ?? undefined}
      >
        <DevboxEntityView
          entity={entity}
          terminal={terminal}
        />
      </div>
    )
    const linked =
      entity.type === DevboxEntityType.SessionMessage
        ? [
            entity.sessionMessage?.toSessionId,
            entity.sessionMessage?.fromSessionId,
          ]
            .map((id) => (id ? bySession.get(id) : undefined))
            .find((s) => s && !placed.has(s.id))
        : undefined
    if (linked && renderSubagentLane) {
      placed.add(linked.id)
      items.push(
        <SubagentLane
          key={`lane:${linked.id}`}
          subagent={linked}
        >
          {renderSubagentLane(linked)}
        </SubagentLane>
      )
    }
  }
  for (const subagent of subagents) {
    if (placed.has(subagent.id) || !renderSubagentLane) continue
    items.push(
      <SubagentLane
        key={`lane:${subagent.id}`}
        subagent={subagent}
      >
        {renderSubagentLane(subagent)}
      </SubagentLane>
    )
  }

  if (!items.length) return <>{empty}</>
  return <TranscriptSC>{items}</TranscriptSC>
}

export function DevboxEntityView({
  entity,
  terminal = () => null,
}: {
  entity: DevboxEntityFragment
  terminal?: TerminalLookup
}) {
  switch (entity.type) {
    case DevboxEntityType.UserMessage:
      if (!entity.message) break
      return (
        <UserMessageSC data-entity="user-message">
          <ContentBlocks blocks={entity.message.content} />
        </UserMessageSC>
      )
    case DevboxEntityType.AgentMessage:
      if (!entity.message) break
      return (
        <div data-entity="agent-message">
          <ContentBlocks blocks={entity.message.content} />
        </div>
      )
    case DevboxEntityType.AgentThought:
      if (!entity.message) break
      return (
        <Collapsible
          data-entity="agent-thought"
          title={<CaptionP $color="text-xlight">Thinking</CaptionP>}
        >
          <ThoughtSC>
            <ContentBlocks blocks={entity.message.content} />
          </ThoughtSC>
        </Collapsible>
      )
    case DevboxEntityType.ToolCall:
      if (!entity.toolCall) break
      return (
        <ToolCallView
          toolCall={entity.toolCall}
          settled={!!entity.settled}
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
        <Collapsible
          data-entity="compaction"
          title={
            <CaptionP $color="text-xlight">
              Context compacted
              {entity.compaction.status ? ` · ${entity.compaction.status}` : ''}
            </CaptionP>
          }
        >
          <ContentBlocks blocks={entity.compaction.summary} />
        </Collapsible>
      )
    case DevboxEntityType.SessionMessage:
      if (!entity.sessionMessage) break
      return (
        <SessionMessageSC data-entity="session-message">
          <CaptionP $color="text-xlight">Message between sessions</CaptionP>
          <ContentBlocks blocks={entity.sessionMessage.content} />
        </SessionMessageSC>
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

export function ContentBlocks({
  blocks,
}: {
  blocks: Nullable<Nullable<DevboxContentBlock>[]>
}) {
  const list = (blocks ?? []).filter(isNonNullable)
  return (
    <Flex
      direction="column"
      gap="small"
    >
      {list.map((block, i) => (
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

const TOOL_STATUS_SEVERITY: Record<string, ChipSeverity> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  failed: 'danger',
}

// Codex's guardian reports each auto-review as a tool call with this id prefix; its status is the verdict.
const GUARDIAN_REVIEW_PREFIX = 'guardian_assessment:'

const GUARDIAN_REVIEW_TITLE: Record<string, string> = {
  pending: 'Codex reviewer is checking',
  in_progress: 'Codex reviewer is checking',
  completed: 'Approved by Codex reviewer',
  failed: 'Not approved by Codex reviewer',
}

const GUARDIAN_REVIEW_STATUS: Record<string, string> = {
  completed: 'approved',
  failed: 'not approved',
}

function ToolCallView({
  toolCall,
  settled,
  terminal,
}: {
  toolCall: DevboxToolCallFragment
  settled: boolean
  terminal: TerminalLookup
}) {
  const content = (toolCall.content ?? []).filter(isNonNullable)
  const status = `${toolCall.status ?? (settled ? 'completed' : 'pending')}`
  const hasDiff = content.some((c) => c.__typename === 'DevboxToolCallDiff')
  const locations = (toolCall.locations ?? []).filter(isNonNullable)
  const review = toolCall.toolCallId?.startsWith(GUARDIAN_REVIEW_PREFIX)
  return (
    <ToolCallSC data-entity="tool-call">
      <Collapsible
        defaultOpen={hasDiff || status === 'failed'}
        title={
          <Flex
            gap="small"
            align="center"
            css={{ minWidth: 0 }}
          >
            {status === 'in_progress' ? (
              <StatusIpIcon size={12} />
            ) : status === 'completed' ? (
              <CheckIcon
                size={12}
                color="icon-success"
              />
            ) : (
              <ToolIcon size={12} />
            )}
            <ToolTitleSC>
              {(review && GUARDIAN_REVIEW_TITLE[status]) ||
                toolCall.title ||
                toolCall.kind ||
                'Tool call'}
            </ToolTitleSC>
            {toolCall.kind && !review && (
              <Chip size="small">{toolCall.kind}</Chip>
            )}
            <Chip
              size="small"
              severity={TOOL_STATUS_SEVERITY[status] ?? 'neutral'}
            >
              {(review && GUARDIAN_REVIEW_STATUS[status]) ||
                status.replace(/_/g, ' ')}
            </Chip>
          </Flex>
        }
      >
        <Flex
          direction="column"
          gap="small"
        >
          {!!locations.length && (
            <CaptionP $color="text-xlight">
              {locations
                .map((l) => (l.line ? `${l.path}:${l.line}` : l.path))
                .join(', ')}
            </CaptionP>
          )}
          {content.map((c, i) => (
            <ToolCallContentView
              key={i}
              content={c}
              terminal={terminal}
            />
          ))}
          {toolCall.rawInput != null && !content.length && (
            <JsonBlock
              title="Input"
              value={toolCall.rawInput}
            />
          )}
          {toolCall.rawOutput != null && (
            <JsonBlock
              title="Output"
              value={toolCall.rawOutput}
            />
          )}
        </Flex>
      </Collapsible>
    </ToolCallSC>
  )
}

function ToolCallContentView({
  content,
  terminal,
}: {
  content: DevboxToolCallContent
  terminal: TerminalLookup
}) {
  switch (content.__typename) {
    case 'DevboxToolCallBlock':
      return content.content ? (
        <ContentBlockView block={content.content} />
      ) : null
    case 'DevboxToolCallDiff':
      return (
        <Flex
          direction="column"
          gap="xxsmall"
          data-content="diff"
        >
          <CaptionP $color="text-light">{content.path}</CaptionP>
          <DiffViewer
            oldValue={content.oldText ?? ''}
            newValue={content.newText ?? ''}
            splitView={false}
          />
        </Flex>
      )
    case 'DevboxToolCallTerminal': {
      const t = terminal(content.terminalId)
      return t ? (
        <TerminalView terminal={t} />
      ) : (
        <CaptionP $color="text-xlight">Terminal {content.terminalId}</CaptionP>
      )
    }
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
    <TerminalSC data-entity="terminal">
      <Flex
        gap="small"
        align="center"
      >
        <TerminalIcon size={12} />
        <TerminalCommandSC>{command || terminal.terminalId}</TerminalCommandSC>
        {exited && (
          <Chip
            size="small"
            severity={terminal.exitCode === 0 ? 'success' : 'danger'}
          >
            {terminal.signal
              ? `signal ${terminal.signal}`
              : `exit ${terminal.exitCode}`}
          </Chip>
        )}
      </Flex>
      {terminal.output && (
        <TerminalOutputSC>
          {terminal.truncated ? '…\n' : ''}
          {terminal.output}
        </TerminalOutputSC>
      )}
    </TerminalSC>
  )
}

const PLAN_STATUS_ICON: Record<string, ReactNode> = {
  completed: (
    <CheckIcon
      size={12}
      color="icon-success"
    />
  ),
  in_progress: <StatusIpIcon size={12} />,
}

function PlanView({
  plan,
}: {
  plan: NonNullable<DevboxEntityFragment['plan']>
}) {
  const entries = (plan.entries ?? []).filter(isNonNullable)
  const done = entries.filter((e) => e.status === 'completed').length
  return (
    <PlanSC data-entity="plan">
      <CaptionP $color="text-light">
        Plan · {done}/{entries.length}
      </CaptionP>
      {entries.map((entry, i) => (
        <Flex
          key={i}
          gap="small"
          align="center"
        >
          {PLAN_STATUS_ICON[`${entry.status}`] ?? <PlanDotSC />}
          <PlanEntrySC $done={entry.status === 'completed'}>
            {entry.content}
          </PlanEntrySC>
          {entry.priority === 'high' && (
            <Chip
              size="small"
              severity="warning"
            >
              high
            </Chip>
          )}
        </Flex>
      ))}
    </PlanSC>
  )
}

function SubagentLane({
  subagent,
  children,
}: {
  subagent: DevboxThreadFragment
  children: ReactNode
}) {
  return (
    <LaneSC data-entity="subagent-lane">
      <Collapsible
        title={
          <Flex
            gap="small"
            align="center"
          >
            <BotIcon size={12} />
            <CaptionP $color="text-light">
              Subagent · {threadTitle(subagent)}
            </CaptionP>
          </Flex>
        }
      >
        {children}
      </Collapsible>
    </LaneSC>
  )
}

export function GenericCard({ label, raw }: { label: string; raw: unknown }) {
  return (
    <GenericSC data-entity="generic">
      <CaptionP $color="text-xlight">{label}</CaptionP>
      {raw != null && <JsonPreSC>{safeJson(raw)}</JsonPreSC>}
    </GenericSC>
  )
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <Flex
      direction="column"
      gap="xxsmall"
    >
      <CaptionP $color="text-xlight">{title}</CaptionP>
      <JsonPreSC>
        {typeof value === 'string' ? value : safeJson(value)}
      </JsonPreSC>
    </Flex>
  )
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
  ...props
}: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  'data-entity'?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div {...props}>
      <CollapseButtonSC
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <CaretDownIcon size={10} /> : <CaretRightIcon size={10} />}
        {title}
      </CollapseButtonSC>
      {open && <CollapseBodySC>{children}</CollapseBodySC>}
    </div>
  )
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
  gap: theme.spacing.medium,
}))

const UserMessageSC = styled.div(({ theme }) => ({
  alignSelf: 'flex-end',
  maxWidth: '85%',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
}))

const ThoughtSC = styled.div(({ theme }) => ({
  color: theme.colors['text-light'],
  borderLeft: theme.borders.default,
  paddingLeft: theme.spacing.medium,
}))

const SessionMessageSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.default,
}))

const ToolCallSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.default,
  backgroundColor: theme.colors['fill-zero'],
}))

const ToolTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TerminalSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors['fill-zero-selected'],
}))

const TerminalCommandSC = styled.code(({ theme }) => ({
  ...theme.partials.text.code,
  color: theme.colors['text-light'],
}))

const TerminalOutputSC = styled.pre(({ theme }) => ({
  ...theme.partials.text.code,
  margin: 0,
  maxHeight: 320,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  color: theme.colors.text,
}))

const PlanSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.default,
}))

const PlanDotSC = styled.span(({ theme }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  border: theme.borders.input,
  flexShrink: 0,
}))

const PlanEntrySC = styled.span<{ $done: boolean }>(({ theme, $done }) => ({
  ...theme.partials.text.body2,
  color: $done ? theme.colors['text-xlight'] : theme.colors.text,
  textDecoration: $done ? 'line-through' : 'none',
}))

const LaneSC = styled.div(({ theme }) => ({
  marginLeft: theme.spacing.medium,
  paddingLeft: theme.spacing.medium,
  borderLeft: `2px solid ${theme.colors['border-fill-two']}`,
}))

const GenericSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.medium,
  border: `1px dashed ${theme.colors.border}`,
}))

const JsonPreSC = styled.pre(({ theme }) => ({
  ...theme.partials.text.code,
  margin: 0,
  maxHeight: 240,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  color: theme.colors['text-light'],
}))

const ImageSC = styled.img({ maxWidth: '100%', borderRadius: 4 })

const CollapseButtonSC = styled.button(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  width: '100%',
  padding: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: theme.colors.text,
  textAlign: 'left',
}))

const CollapseBodySC = styled.div(({ theme }) => ({
  paddingTop: theme.spacing.small,
}))
