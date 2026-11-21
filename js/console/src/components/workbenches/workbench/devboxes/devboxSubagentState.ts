import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxForegroundState,
  DevboxInteractionFragment,
  DevboxInteractionState,
  DevboxThreadFragment,
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

// subagents still working or waiting on a person, needing you first
export function activeSubagents<
  S extends Pick<
    DevboxThreadFragment,
    'id' | 'foregroundState' | 'stopReason' | 'error'
  >,
>(subagents: S[], interactions: Interaction[]): S[] {
  const rank = (s: S) =>
    subagentState(s, interactions) === 'needs you' ? 0 : 1
  return subagents
    .filter((s) => {
      const state = subagentState(s, interactions)
      return state === 'needs you' || state === 'running'
    })
    .toSorted((a, b) => rank(a) - rank(b))
}

// the newest thing a subagent said or did, for a one-line preview
export function latestActivity(
  entities: DevboxEntityFragment[]
): string | undefined {
  for (const entity of entities.toReversed()) {
    if (entity.type === DevboxEntityType.ToolCall && entity.toolCall?.title)
      return entity.toolCall.title
    if (entity.type !== DevboxEntityType.AgentMessage) continue
    const text = (entity.message?.content ?? [])
      .filter(isNonNullable)
      .flatMap((b) =>
        b.__typename === 'DevboxTextContent' && b.text ? [b.text] : []
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) return text
  }
  return undefined
}

// subagents keyed by the parent's tool call that spawned them
export function subagentsBySpawner<
  S extends Pick<DevboxThreadFragment, 'parentToolCallId'>,
>(subagents: S[]): Map<string, S> {
  return new Map(
    subagents.flatMap((s) =>
      s.parentToolCallId ? [[s.parentToolCallId, s] as const] : []
    )
  )
}
