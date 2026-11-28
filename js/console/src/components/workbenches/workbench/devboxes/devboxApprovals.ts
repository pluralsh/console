import {
  DevboxEntityType,
  DevboxThreadFragment,
  DevboxToolCallFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { mcpCall } from './devboxIntegrations'
import { DevboxTimelineStore, selectOrderedEntities } from './devboxTimeline'

export type ApprovalDiff = { path: string; oldText: string; newText: string }

export type ApprovalPreview =
  | { kind: 'edit'; diffs: ApprovalDiff[] }
  | { kind: 'command'; command: string; cwd?: string; description?: string }
  | { kind: 'mcp'; server: string; tool: string; args: unknown }
  | { kind: 'generic'; input: unknown }

type Input = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const isEmpty = (v: unknown) =>
  v == null || (typeof v === 'object' && !Object.keys(v as object).length)

// what a permission request would do, from the tool call it was raised for
export function approvalPreview(
  toolCall: Nullable<DevboxToolCallFragment>
): Nullable<ApprovalPreview> {
  if (!toolCall) return null
  const raw = toolCall.rawInput
  const input: Input =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Input) : {}

  const diffs = toolCallDiffs(toolCall)
  if (diffs.length) return { kind: 'edit', diffs }

  const command = Array.isArray(input.command)
    ? input.command.join(' ')
    : str(input.command)
  if (command || toolCall.kind === 'execute')
    return {
      kind: 'command',
      command: command ?? (toolCall.title ?? '').replace(/^`|`$/g, ''),
      cwd: str(input.cwd) ?? str(input.workdir),
      description: str(input.description),
    }

  const mcp = mcpCall(toolCall)
  if (mcp) return { kind: 'mcp', ...mcp }

  return isEmpty(raw) ? null : { kind: 'generic', input: raw }
}

const FILE_EDIT_KINDS = new Set(['edit', 'delete', 'move'])

export function isFileEditToolCall(toolCall: Nullable<DevboxToolCallFragment>) {
  return (
    !!toolCall &&
    (FILE_EDIT_KINDS.has(`${toolCall.kind ?? ''}`) ||
      !!toolCallDiffs(toolCall).length)
  )
}

// the diffs an edit attached, or rebuilt from its input before it has run
export function toolCallDiffs(
  toolCall: DevboxToolCallFragment
): ApprovalDiff[] {
  const attached = (toolCall.content ?? [])
    .filter(isNonNullable)
    .flatMap((c) =>
      c.__typename === 'DevboxToolCallDiff'
        ? [
            {
              path: c.path ?? '',
              oldText: c.oldText ?? '',
              newText: c.newText ?? '',
            },
          ]
        : []
    )
  if (attached.length) return attached
  const raw = toolCall.rawInput
  return inputDiffs(
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Input) : {},
    toolCall
  )
}

// Claude's Edit, MultiEdit and Write inputs, for agents that don't attach diff content
function inputDiffs(
  input: Input,
  toolCall: DevboxToolCallFragment
): ApprovalDiff[] {
  const path =
    str(input.file_path) ??
    str(input.path) ??
    toolCall.locations?.find(isNonNullable)?.path ??
    ''
  if (typeof input.new_string === 'string')
    return [
      { path, oldText: str(input.old_string) ?? '', newText: input.new_string },
    ]
  if (Array.isArray(input.edits))
    return input.edits.flatMap((e) =>
      e && typeof e === 'object' && typeof (e as Input).new_string === 'string'
        ? [
            {
              path,
              oldText: str((e as Input).old_string) ?? '',
              newText: (e as Input).new_string as string,
            },
          ]
        : []
    )
  if (path && typeof input.content === 'string')
    return [{ path, oldText: '', newText: input.content }]
  return []
}

// the tool call an interaction was raised for, in whichever loaded session holds it
type OwnedInteraction = {
  toolCallId?: Nullable<string>
  thread?: Nullable<{ id: string; sessionId?: Nullable<string> }>
}

// the thread an interaction is for is the one whose transcript holds its tool
// call: agents raise a subagent's permission requests on the parent's session,
// so the recorded thread alone files them under the parent
export function attributeInteractions<T extends OwnedInteraction>(
  interactions: T[],
  threads: Pick<DevboxThreadFragment, 'id' | 'sessionId' | 'title'>[],
  store: Nullable<DevboxTimelineStore>
): T[] {
  if (!store) return interactions
  const sessionsByCall = new Map<string, Set<string>>()
  for (const [sessionId, session] of Object.entries(store.sessions))
    for (const e of selectOrderedEntities(session)) {
      const id = e.type === DevboxEntityType.ToolCall && e.toolCall?.toolCallId
      if (id)
        sessionsByCall.set(
          id,
          (sessionsByCall.get(id) ?? new Set()).add(sessionId)
        )
    }
  const bySession = new Map(
    threads.flatMap((t) => (t.sessionId ? [[t.sessionId, t] as const] : []))
  )
  return interactions.map((i) => {
    const sessions = i.toolCallId ? sessionsByCall.get(i.toolCallId) : undefined
    if (!sessions?.size) return i
    if (i.thread?.sessionId && sessions.has(i.thread.sessionId)) return i
    const owner = [...sessions].map((s) => bySession.get(s)).find(isNonNullable)
    if (!owner || owner.id === i.thread?.id) return i
    const { id, sessionId, title } = owner
    return { ...i, thread: { ...i.thread, id, sessionId, title } }
  })
}

export function findToolCall(
  store: DevboxTimelineStore,
  toolCallId: Nullable<string>
): Nullable<DevboxToolCallFragment> {
  if (!toolCallId) return null
  for (const session of Object.values(store.sessions)) {
    const entity = selectOrderedEntities(session).find(
      (e) =>
        e.type === DevboxEntityType.ToolCall &&
        e.toolCall?.toolCallId === toolCallId
    )
    if (entity?.toolCall) return entity.toolCall
  }
  return null
}
