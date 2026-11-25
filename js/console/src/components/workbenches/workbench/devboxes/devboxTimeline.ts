import {
  DevboxContentBlockFragment,
  DevboxContentBlockType,
  DevboxDeltaOp,
  DevboxEntityChangeFragment,
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxToolCallContentType,
  DevboxToolCallFragment,
} from 'generated/graphql'

export type DevboxContentBlock = DevboxContentBlockFragment
export type DevboxToolCallContent = NonNullable<
  NonNullable<DevboxToolCallFragment['content']>[number]
>

export type DevboxNotice = {
  key: string
  sessionId: Nullable<string>
  payload: Record<string, unknown>
}

export type DevboxTimelinePullRequest = {
  id?: string
  url?: string
  title?: string
  source?: string
  threadId?: Nullable<string>
  sessionId?: Nullable<string>
  position?: Nullable<number>
}

export type DevboxSessionTimeline = {
  loaded: boolean
  // unnumbered live deltas at or below this offset are already in the loaded entities
  deltaOffset: Nullable<number>
  // the daemon run numbering this session's deltas, and the last seq applied:
  // numbered deltas apply strictly in seq order, since delivery isn't ordered
  stream: Nullable<string>
  seq: Nullable<number>
  // numbered deltas past a gap, held (by seq) until it fills
  pending: Record<number, DevboxEntityChangeFragment>
  // a delta arrived that can't be ordered against the loaded page (another
  // stream, or too many held): the page needs reloading
  stale: boolean
  hasMore: boolean
  entities: Record<string, DevboxEntityFragment>
  // deltas received before the first page loaded, replayed on top of it
  buffered: DevboxEntityChangeFragment[]
  // the latest `state` delta payload per ACP update kind
  state: Record<string, Record<string, unknown>>
}

export type DevboxTimelineStore = {
  sessions: Record<string, DevboxSessionTimeline>
  notices: DevboxNotice[]
  pullRequests: DevboxTimelinePullRequest[]
}

export type DevboxTimelinePage = {
  entities?: Nullable<Nullable<DevboxEntityFragment>[]>
  deltaOffset?: Nullable<number | string>
  seq?: Nullable<number | string>
  stream?: Nullable<string>
  hasMore?: Nullable<boolean>
}

export type DevboxTimelineAction =
  | {
      type: 'page'
      sessionId: string
      page: DevboxTimelinePage
      // `older` pages extend history backwards and leave the delta offset alone
      older?: boolean
    }
  | { type: 'delta'; change: DevboxEntityChangeFragment }
  | { type: 'dismissNotice'; key: string }
  | { type: 'reset'; sessionId?: string }

const BUFFER_LIMIT = 5000

export const EMPTY_DEVBOX_TIMELINE: DevboxTimelineStore = {
  sessions: {},
  notices: [],
  pullRequests: [],
}

export const emptySessionTimeline = (): DevboxSessionTimeline => ({
  loaded: false,
  deltaOffset: null,
  stream: null,
  seq: null,
  pending: {},
  stale: false,
  hasMore: false,
  entities: {},
  buffered: [],
  state: {},
})

export const entityKey = (type: Nullable<string>, id: Nullable<string>) =>
  `${type ?? DevboxEntityType.Unknown}:${id ?? ''}`

const toNumber = (v: unknown): Nullable<number> => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

const revisionOf = (e: Nullable<DevboxEntityFragment>) =>
  toNumber(e?.revision) ?? -1

export function devboxTimelineReducer(
  store: DevboxTimelineStore,
  action: DevboxTimelineAction
): DevboxTimelineStore {
  switch (action.type) {
    case 'page':
      return applyPage(store, action.sessionId, action.page, !!action.older)
    case 'delta':
      return applyDelta(store, action.change)
    case 'dismissNotice':
      return {
        ...store,
        notices: store.notices.filter(({ key }) => key !== action.key),
      }
    case 'reset': {
      if (!action.sessionId) return EMPTY_DEVBOX_TIMELINE
      const { [action.sessionId]: _, ...sessions } = store.sessions
      return { ...store, sessions }
    }
  }
}

function applyPage(
  store: DevboxTimelineStore,
  sessionId: string,
  page: DevboxTimelinePage,
  older: boolean
): DevboxTimelineStore {
  const prev = store.sessions[sessionId] ?? emptySessionTimeline()
  const entities = { ...prev.entities }

  for (const entity of page.entities ?? []) {
    if (!entity) continue
    const key = entityKey(entity.type, entity.id)
    // a live copy only wins if it's at a newer revision than the archive's
    if (revisionOf(entities[key]) > revisionOf(entity)) continue
    entities[key] = entity
  }

  const pageOffset = toNumber(page.deltaOffset)
  const deltaOffset = older
    ? prev.deltaOffset
    : maxNullable(prev.deltaOffset, pageOffset)
  let session: DevboxSessionTimeline = {
    ...prev,
    loaded: true,
    hasMore: older || !prev.loaded ? !!page.hasMore : prev.hasMore,
    entities,
    deltaOffset,
    buffered: [],
  }
  // the newest page is where the session's numbered deltas resume; whatever
  // was held or buffered is replayed against it
  if (!older) {
    const held = [...prev.buffered, ...Object.values(prev.pending)]
    session = {
      ...session,
      stream: page.stream || null,
      seq: toNumber(page.seq) ?? 0,
      pending: {},
      stale: false,
    }
    for (const change of held) session = receive(session, change, true)
  }

  return { ...store, sessions: { ...store.sessions, [sessionId]: session } }
}

// orders a session's numbered deltas: applies the next one in seq, holds any
// past a gap and drains what it unblocks. `replay` drops what can't be ordered
// against the page instead of asking for another
function receive(
  session: DevboxSessionTimeline,
  change: DevboxEntityChangeFragment,
  replay = false
): DevboxSessionTimeline {
  const seq = toNumber(change.seq)
  if (!seq) return applyToSession(session, change, false)
  if (change.stream !== session.stream)
    return replay || session.stale ? session : { ...session, stale: true }
  const last = session.seq ?? 0
  if (seq <= last) return session
  if (seq > last + 1) {
    if (Object.keys(session.pending).length >= BUFFER_LIMIT)
      return { ...session, stale: true }
    return { ...session, pending: { ...session.pending, [seq]: change } }
  }

  let next = { ...applyToSession(session, change, true), seq }
  if (!Object.keys(next.pending).length) return next
  const pending = { ...next.pending }
  for (let s = seq + 1; pending[s]; s++) {
    next = { ...applyToSession(next, pending[s], true), seq: s }
    delete pending[s]
  }
  return { ...next, pending }
}

function applyDelta(
  store: DevboxTimelineStore,
  change: DevboxEntityChangeFragment
): DevboxTimelineStore {
  switch (change.op) {
    case DevboxDeltaOp.Notice:
      return {
        ...store,
        notices: [
          ...store.notices,
          {
            key: `${change.offset ?? ''}:${change.emittedAt ?? ''}:${store.notices.length}`,
            sessionId: change.sessionId,
            payload: change.payload ?? {},
          },
        ],
      }
    case DevboxDeltaOp.PullRequest: {
      const payload = (change.payload ?? {}) as DevboxTimelinePullRequest
      if (
        payload.id &&
        store.pullRequests.some(({ id }) => id && id === payload.id)
      )
        return store
      return {
        ...store,
        pullRequests: [
          ...store.pullRequests,
          {
            ...payload,
            threadId: change.threadId,
            sessionId: change.sessionId,
            position: toNumber(change.position),
          },
        ],
      }
    }
    default:
      break
  }

  const sessionId = change.sessionId ?? change.entity?.sessionId
  if (!sessionId) return store
  const prev = store.sessions[sessionId] ?? emptySessionTimeline()

  if (!prev.loaded) {
    const buffered = [...prev.buffered, change].slice(-BUFFER_LIMIT)
    return {
      ...store,
      sessions: { ...store.sessions, [sessionId]: { ...prev, buffered } },
    }
  }

  const next = receive(prev, change)
  if (next === prev) return store
  return { ...store, sessions: { ...store.sessions, [sessionId]: next } }
}

// applies one delta; `ordered` ones come in seq order, so the offset check
// that guards unnumbered ones would only drop deltas that arrived late
function applyToSession(
  session: DevboxSessionTimeline,
  change: DevboxEntityChangeFragment,
  ordered: boolean
): DevboxSessionTimeline {
  const offset = toNumber(change.offset)
  const deltaOffset = ordered
    ? session.deltaOffset
    : maxNullable(session.deltaOffset, offset)

  // a settle carries the whole entity and is ordered by its revision, so it still repairs an entity whose chunks
  // were missed even when it arrives behind a later delta
  if (change.op === DevboxDeltaOp.Settle) {
    const entity = change.entity
    if (!entity) return { ...session, deltaOffset }
    const key = entityKey(entity.type, entity.id)
    if (revisionOf(session.entities[key]) > revisionOf(entity))
      return { ...session, deltaOffset }
    return {
      ...session,
      deltaOffset,
      entities: { ...session.entities, [key]: { ...entity, settled: true } },
    }
  }

  if (
    !ordered &&
    offset != null &&
    session.deltaOffset != null &&
    offset <= session.deltaOffset
  )
    return session

  if (change.op === DevboxDeltaOp.State) {
    return {
      ...session,
      deltaOffset,
      state: {
        ...session.state,
        [change.stateKind ?? 'unknown']: change.payload ?? {},
      },
    }
  }

  if (change.op !== DevboxDeltaOp.Append && change.op !== DevboxDeltaOp.Patch)
    return { ...session, deltaOffset }

  const type = change.entityType ?? DevboxEntityType.Unknown
  const key = entityKey(type, change.entityId)
  const existing =
    session.entities[key] ??
    newLiveEntity(type, change.entityId, change.sessionId, change.position)
  const payload = change.payload ?? {}
  const updated =
    change.op === DevboxDeltaOp.Append
      ? appendToEntity(existing, payload)
      : patchEntity(existing, payload)

  return {
    ...session,
    deltaOffset,
    entities: {
      ...session.entities,
      [key]: { ...updated, settled: false, updatedAt: change.emittedAt },
    },
  }
}

function newLiveEntity(
  type: DevboxEntityType,
  id: Nullable<string>,
  sessionId: Nullable<string>,
  position: unknown
): DevboxEntityFragment {
  const base: DevboxEntityFragment = {
    __typename: 'DevboxEntity',
    id,
    sessionId,
    type,
    position: toNumber(position),
    revision: null,
    settled: false,
    raw: {},
  }
  switch (type) {
    case DevboxEntityType.UserMessage:
    case DevboxEntityType.AgentMessage:
    case DevboxEntityType.AgentThought:
      return { ...base, message: { messageId: id, content: [] } }
    case DevboxEntityType.SessionMessage:
      return { ...base, sessionMessage: { messageId: id, content: [] } }
    case DevboxEntityType.ToolCall:
      return { ...base, toolCall: { toolCallId: id, content: [] } }
    case DevboxEntityType.Plan:
      return { ...base, plan: { planId: id, entries: [] } }
    case DevboxEntityType.Terminal:
      return { ...base, terminal: { terminalId: id, output: '' } }
    case DevboxEntityType.Compaction:
      return { ...base, compaction: { compactionId: id, summary: [] } }
    default:
      return base
  }
}

// ACP upsert: omitted fields are unchanged, null clears, values replace
function upsert<T extends Record<string, unknown>>(
  target: T,
  patch: Record<string, unknown>,
  fields: Record<string, string | ((v: unknown) => unknown)>
): T {
  const next: Record<string, unknown> = { ...target }
  for (const [acpKey, mapping] of Object.entries(fields)) {
    if (!(acpKey in patch)) continue
    const value = patch[acpKey]
    const [field, convert] =
      typeof mapping === 'string' ? [mapping, undefined] : [acpKey, mapping]
    next[field] = value === null ? null : convert ? convert(value) : value
  }
  return next as T
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}

const asArray = (v: unknown): unknown[] =>
  Array.isArray(v) ? v : v === null || v === undefined ? [] : [v]

export function patchEntity(
  entity: DevboxEntityFragment,
  patch: Record<string, unknown>
): DevboxEntityFragment {
  const raw = { ...(entity.raw ?? {}), ...patch }
  switch (entity.type) {
    case DevboxEntityType.UserMessage:
    case DevboxEntityType.AgentMessage:
    case DevboxEntityType.AgentThought:
      return {
        ...entity,
        raw,
        message: upsert(entity.message ?? {}, patch, {
          messageId: 'messageId',
          content: (v) => asArray(v).map(acpContentBlock),
          promptId: 'promptId',
          _meta: 'meta',
        }),
      }
    case DevboxEntityType.SessionMessage:
      return {
        ...entity,
        raw,
        sessionMessage: upsert(entity.sessionMessage ?? {}, patch, {
          fromSessionId: 'fromSessionId',
          toSessionId: 'toSessionId',
          content: (v) => asArray(v).map(acpContentBlock),
          _meta: 'meta',
        }),
      }
    case DevboxEntityType.ToolCall:
      return {
        ...entity,
        raw,
        toolCall: upsert(entity.toolCall ?? {}, patch, {
          toolCallId: 'toolCallId',
          title: 'title',
          kind: 'kind',
          status: 'status',
          content: (v) => asArray(v).map(acpToolCallContent),
          locations: (v) =>
            asArray(v).map((l) => ({
              path: asRecord(l).path as string,
              line: asRecord(l).line as number,
            })),
          rawInput: (v) => asRecord(v),
          rawOutput: (v) => asRecord(v),
          _meta: 'meta',
        }),
      }
    case DevboxEntityType.Plan:
      return {
        ...entity,
        raw,
        plan: upsert(entity.plan ?? {}, patch, {
          planId: 'planId',
          entries: (v) =>
            asArray(v).map((e) => {
              const r = asRecord(e)
              return {
                content: r.content as string,
                priority: r.priority as string,
                status: r.status as string,
              }
            }),
          _meta: 'meta',
        }),
      }
    case DevboxEntityType.Terminal: {
      const exit = asRecord(patch.exitStatus)
      const terminal = upsert(entity.terminal ?? {}, patch, {
        terminalId: 'terminalId',
        command: 'command',
        args: 'args',
        cwd: 'cwd',
        output: 'output',
        truncated: 'truncated',
        _meta: 'meta',
      })
      if ('exitStatus' in patch) {
        terminal.exitCode = (exit.exitCode as number) ?? null
        terminal.signal = (exit.signal as string) ?? null
      }
      return { ...entity, raw, terminal }
    }
    case DevboxEntityType.Compaction:
      return {
        ...entity,
        raw,
        compaction: upsert(entity.compaction ?? {}, patch, {
          compactionId: 'compactionId',
          status: 'status',
          summary: (v) => asArray(v).map(acpContentBlock),
          _meta: 'meta',
        }),
      }
    default:
      return { ...entity, raw }
  }
}

// a chunk: message content (one block or several), or terminal output
export function appendToEntity(
  entity: DevboxEntityFragment,
  chunk: Record<string, unknown>
): DevboxEntityFragment {
  if (entity.type === DevboxEntityType.Terminal) {
    const text = (chunk.output ?? chunk.data ?? chunk.text ?? '') as string
    return {
      ...entity,
      terminal: {
        ...entity.terminal,
        output: `${entity.terminal?.output ?? ''}${text}`,
      },
    }
  }

  const blocks = asArray(chunk.content ?? (chunk.text ? chunk : null)).map(
    acpContentBlock
  )
  if (!blocks.length) return entity

  if (entity.message || isMessageType(entity.type))
    return {
      ...entity,
      message: {
        ...entity.message,
        content: appendBlocks(entity.message?.content ?? [], blocks),
      },
    }
  if (entity.sessionMessage)
    return {
      ...entity,
      sessionMessage: {
        ...entity.sessionMessage,
        content: appendBlocks(entity.sessionMessage.content ?? [], blocks),
      },
    }
  if (entity.compaction)
    return {
      ...entity,
      compaction: {
        ...entity.compaction,
        summary: appendBlocks(entity.compaction.summary ?? [], blocks),
      },
    }
  return entity
}

const isMessageType = (type: DevboxEntityType) =>
  type === DevboxEntityType.UserMessage ||
  type === DevboxEntityType.AgentMessage ||
  type === DevboxEntityType.AgentThought

// consecutive text chunks join into one text block
function appendBlocks(
  existing: Nullable<DevboxContentBlock>[],
  blocks: DevboxContentBlock[]
): DevboxContentBlock[] {
  const out = existing.filter(Boolean) as DevboxContentBlock[]
  for (const block of blocks) {
    const last = out[out.length - 1]
    if (
      last?.type === DevboxContentBlockType.Text &&
      block.type === DevboxContentBlockType.Text &&
      'text' in last &&
      'text' in block
    ) {
      out[out.length - 1] = {
        ...last,
        text: `${last.text ?? ''}${block.text ?? ''}`,
      }
    } else out.push(block)
  }
  return out
}

// verbatim ACP ContentBlock JSON to the GraphQL shape the renderer reads
export function acpContentBlock(value: unknown): DevboxContentBlock {
  const b = asRecord(value)
  switch (b.type) {
    case 'text':
      return {
        __typename: 'DevboxTextContent',
        type: DevboxContentBlockType.Text,
        text: (b.text as string) ?? '',
        annotations: asRecord(b.annotations),
      }
    case 'image':
      return {
        __typename: 'DevboxImageContent',
        type: DevboxContentBlockType.Image,
        data: b.data as string,
        mimeType: b.mimeType as string,
        uri: b.uri as string,
      }
    case 'audio':
      return {
        __typename: 'DevboxAudioContent',
        type: DevboxContentBlockType.Audio,
        data: b.data as string,
        mimeType: b.mimeType as string,
      }
    case 'resource_link':
      return {
        __typename: 'DevboxResourceLinkContent',
        type: DevboxContentBlockType.ResourceLink,
        uri: b.uri as string,
        name: b.name as string,
        title: b.title as string,
        description: b.description as string,
        mimeType: b.mimeType as string,
        size: b.size,
      }
    case 'resource': {
      const r = asRecord(b.resource)
      return {
        __typename: 'DevboxResourceContent',
        type: DevboxContentBlockType.Resource,
        uri: r.uri as string,
        mimeType: r.mimeType as string,
        text: r.text as string,
        blob: r.blob as string,
      }
    }
    default:
      return {
        __typename: 'DevboxUnknownContent',
        type: DevboxContentBlockType.Unknown,
        variant: typeof b.type === 'string' ? b.type : null,
        raw: b,
      }
  }
}

export function acpToolCallContent(value: unknown): DevboxToolCallContent {
  const c = asRecord(value)
  switch (c.type) {
    case 'content':
      return {
        __typename: 'DevboxToolCallBlock',
        type: DevboxToolCallContentType.Content,
        content: acpContentBlock(c.content),
      }
    case 'diff':
      return {
        __typename: 'DevboxToolCallDiff',
        type: DevboxToolCallContentType.Diff,
        path: c.path as string,
        oldText: (c.oldText as string) ?? null,
        newText: c.newText as string,
      }
    case 'terminal':
      return {
        __typename: 'DevboxToolCallTerminal',
        type: DevboxToolCallContentType.Terminal,
        terminalId: c.terminalId as string,
      }
    default:
      return {
        __typename: 'DevboxToolCallUnknown',
        type: DevboxToolCallContentType.Unknown,
        variant: typeof c.type === 'string' ? c.type : null,
        raw: c,
      }
  }
}

function maxNullable(a: Nullable<number>, b: Nullable<number>) {
  if (a === null || a === undefined) return b ?? null
  if (b === null || b === undefined) return a
  return Math.max(a, b)
}

export function selectOrderedEntities(
  session: Nullable<DevboxSessionTimeline>
): DevboxEntityFragment[] {
  if (!session) return []
  return Object.values(session.entities).toSorted((a, b) => {
    const pa = toNumber(a.position) ?? Number.MAX_SAFE_INTEGER
    const pb = toNumber(b.position) ?? Number.MAX_SAFE_INTEGER
    return pa - pb || `${a.id}`.localeCompare(`${b.id}`)
  })
}

export function selectTerminalOutput(
  session: Nullable<DevboxSessionTimeline>,
  terminalId: Nullable<string>
) {
  if (!session || !terminalId) return undefined
  return session.entities[entityKey(DevboxEntityType.Terminal, terminalId)]
    ?.terminal
}

export const selectOldestPosition = (
  session: Nullable<DevboxSessionTimeline>
) => toNumber(selectOrderedEntities(session)[0]?.position)
