import {
  DevboxAgentFragment,
  DevboxAgentType,
  DevboxForegroundState,
  DevboxSessionCapabilitiesFragment,
  DevboxThreadFragment,
  DevboxThreadKind,
  DevboxThreadStage,
  DevboxThreadStatus,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type DevboxThreadAction =
  | 'rename'
  | 'fork'
  | 'close'
  | 'resume'
  | 'delete'

export type DevboxThreadState =
  | 'running'
  | 'needs you'
  | 'waiting'
  | 'idle'
  | 'closed'

// the thread param while composing a new session
export const NEW_SESSION = 'new'

// the thread in the URL, else the first live top-level one
export function selectedThread(
  threads: Nullable<Nullable<DevboxThreadFragment>[]>,
  threadId: Nullable<string>
) {
  if (threadId === NEW_SESSION) return undefined
  const all = (threads ?? []).filter(isNonNullable)
  return (
    all.find((t) => t.id === threadId) ??
    all.find(
      (t) =>
        t.kind !== DevboxThreadKind.Subagent &&
        t.status !== DevboxThreadStatus.Deleted
    )
  )
}

export function threadState(
  thread: Pick<DevboxThreadFragment, 'status' | 'foregroundState'>
): DevboxThreadState {
  if (
    thread.status === DevboxThreadStatus.Closed ||
    thread.status === DevboxThreadStatus.Deleted
  )
    return 'closed'
  if (thread.foregroundState === DevboxForegroundState.RequiresAction)
    return 'needs you'
  if (thread.status === DevboxThreadStatus.Waiting) return 'waiting'
  if (thread.foregroundState === DevboxForegroundState.Running) return 'running'
  return 'idle'
}

// titles taken from a prompt carry its file mention tags
const FILE_MENTION_TAG =
  /<plrl-devbox-file\s+path="([^"]*)"\s*(?:\/>|><\/plrl-devbox-file>)/g

// prompt text with file mention tags shown as @name
export const promptPreview = (text: string) =>
  text.replace(
    FILE_MENTION_TAG,
    (_, path: string) => `@${path.replace(/\/$/, '').split('/').pop() || path}`
  )

export const threadTitle = (
  thread: Pick<DevboxThreadFragment, 'title' | 'agentTitle' | 'id'>
) => promptPreview(thread.title || thread.agentTitle || 'Untitled thread')

export function capabilitiesFor(
  agents: Nullable<Nullable<DevboxAgentFragment>[]>,
  agent: Nullable<DevboxAgentType>
): DevboxSessionCapabilitiesFragment {
  return agents?.find((a) => a?.type === agent)?.sessionCapabilities ?? {}
}

// Every thread operation is an ACP built-in, so actions the agent doesn't
// advertise are hidden. Close and delete always work: without agent support
// the daemon cancels the session, and delete is console-side only. Actions
// that came back UNSUPPORTED at runtime are hidden too.
export function availableThreadActions(
  thread: Pick<DevboxThreadFragment, 'status' | 'kind'>,
  caps: DevboxSessionCapabilitiesFragment,
  unsupported: ReadonlySet<DevboxThreadAction> = new Set()
): DevboxThreadAction[] {
  if (thread.kind === DevboxThreadKind.Subagent) return []
  const closed =
    thread.status === DevboxThreadStatus.Closed ||
    thread.status === DevboxThreadStatus.Deleted
  const actions: DevboxThreadAction[] = ['rename']
  if (caps.fork && !closed) actions.push('fork')
  if (closed) {
    if (caps.resume || caps.load) actions.push('resume')
  } else actions.push('close')
  if (thread.status !== DevboxThreadStatus.Deleted) actions.push('delete')
  return actions.filter((a) => !unsupported.has(a))
}

export const canImportSessions = (
  agents: Nullable<Nullable<DevboxAgentFragment>[]>
) => (agents ?? []).some((a) => a?.sessionCapabilities?.list)

export type DevboxThreadNode = DevboxThreadFragment & {
  children: DevboxThreadFragment[]
}

// top-level threads, each with the subagents it spawned
export function buildThreadTree(
  threads: Nullable<Nullable<DevboxThreadFragment>[]>
): DevboxThreadNode[] {
  const list = (threads ?? []).filter(isNonNullable)
  const children = new Map<string, DevboxThreadFragment[]>()
  for (const t of list) {
    if (t.kind !== DevboxThreadKind.Subagent || !t.parent?.id) continue
    children.set(t.parent.id, [...(children.get(t.parent.id) ?? []), t])
  }
  return list
    .filter((t) => t.kind !== DevboxThreadKind.Subagent || !t.parent?.id)
    .filter((t) => t.status !== DevboxThreadStatus.Deleted)
    .toSorted((a, b) =>
      `${b.lastActivityAt ?? b.insertedAt ?? ''}`.localeCompare(
        `${a.lastActivityAt ?? a.insertedAt ?? ''}`
      )
    )
    .map((t) => ({ ...t, children: children.get(t.id) ?? [] }))
}

export const THREAD_STAGES = [
  { stage: DevboxThreadStage.NeedsReview, label: 'Needs review' },
  { stage: DevboxThreadStage.Running, label: 'Running' },
  { stage: DevboxThreadStage.Completed, label: 'Completed' },
] as const

export type DevboxThreadGroup = (typeof THREAD_STAGES)[number] & {
  threads: DevboxThreadNode[]
}

// the thread tree split by the server-computed stage, empty stages dropped
export function groupThreadsByStage(
  tree: DevboxThreadNode[]
): DevboxThreadGroup[] {
  return THREAD_STAGES.map((group) => ({
    ...group,
    threads: tree.filter((t) => t.stage === group.stage),
  })).filter((group) => group.threads.length)
}

export const ALL_REPOSITORIES_CWD = '~'
export const repoCwd = (name: string) => `~/${name}`
