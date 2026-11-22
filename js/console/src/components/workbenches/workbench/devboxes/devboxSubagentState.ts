import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxForegroundState,
  DevboxInteractionFragment,
  DevboxInteractionState,
  DevboxThreadFragment,
  DevboxToolCallFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type SubagentState = 'needs you' | 'running' | 'failed' | 'done'

type Interaction = Pick<DevboxInteractionFragment, 'state'> & {
  thread?: Nullable<{ id: string }>
}

export function pendingInteractionsFor<T extends Interaction>(
  subagent: Pick<DevboxThreadFragment, 'id'>,
  interactions: T[]
): T[] {
  return interactions.filter(
    (i) =>
      i.state === DevboxInteractionState.Pending && i.thread?.id === subagent.id
  )
}

export function subagentState(
  subagent: Pick<
    DevboxThreadFragment,
    'id' | 'foregroundState' | 'stopReason' | 'error'
  >,
  interactions: Interaction[]
): SubagentState {
  if (
    pendingInteractionsFor(subagent, interactions).length ||
    subagent.foregroundState === DevboxForegroundState.RequiresAction
  )
    return 'needs you'
  if (subagent.foregroundState === DevboxForegroundState.Running)
    return 'running'
  if (subagent.error || subagent.stopReason === 'error') return 'failed'
  return 'done'
}

function entityText(entity: DevboxEntityFragment): string {
  return (entity.message?.content ?? entity.sessionMessage?.content ?? [])
    .filter(isNonNullable)
    .flatMap((b) =>
      b.__typename === 'DevboxTextContent' && b.text ? [b.text] : []
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const TASK_TYPES = [
  DevboxEntityType.UserMessage,
  DevboxEntityType.SessionMessage,
]

const TASK_INPUTS = ['prompt', 'task', 'message', 'description']

// the task a subagent was given, from what spawned it in the parent: the spawn
// message, or the spawning tool call's input
export function spawnTask(
  spawner: Nullable<DevboxEntityFragment>
): string | undefined {
  if (!spawner) return undefined
  const raw = spawner.toolCall?.rawInput
  const input =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const fromInput = TASK_INPUTS.map((k) => input[k]).find(
    (v): v is string => typeof v === 'string' && !!v.trim()
  )
  return (
    (fromInput ?? entityText(spawner)).replace(/\s+/g, ' ').trim() || undefined
  )
}

// a subagent's one-line summary, as a workbench activity's: its task while it
// works, and its answer once it's done
export function subagentSummary(
  entities: DevboxEntityFragment[],
  running: boolean,
  spawner?: Nullable<DevboxEntityFragment>
): string | undefined {
  const text = (types: DevboxEntityType[], newest: boolean) =>
    (newest ? entities.toReversed() : entities)
      .filter((e) => types.includes(e.type))
      .map(entityText)
      .find(Boolean)
  const task = spawnTask(spawner) || text(TASK_TYPES, false)
  const answer = text([DevboxEntityType.AgentMessage], true)
  return (running ? task || answer : answer || task) || undefined
}

// the tool call a subagent is on, shown beside its title while it runs
export function latestToolCall(
  entities: DevboxEntityFragment[]
): Nullable<DevboxToolCallFragment> {
  return entities.findLast((e) => e.type === DevboxEntityType.ToolCall)
    ?.toolCall
}

// subagents grouped by the parent's tool call that spawned them; one call can run several (pi's parallel mode)
export function subagentsBySpawner<
  S extends Pick<DevboxThreadFragment, 'parentToolCallId'>,
>(subagents: S[]): Map<string, S[]> {
  const out = new Map<string, S[]>()
  for (const s of subagents) {
    if (!s.parentToolCallId) continue
    const group = out.get(s.parentToolCallId)
    if (group) group.push(s)
    else out.set(s.parentToolCallId, [s])
  }
  return out
}
