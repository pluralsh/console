import {
  DevboxContentBlockType,
  DevboxDeltaOp,
  DevboxEntityChangeFragment,
  DevboxEntityFragment,
  DevboxEntityType,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  DevboxTimelineStore,
  EMPTY_DEVBOX_TIMELINE,
  devboxTimelineReducer,
  entityKey,
  selectOrderedEntities,
} from './devboxTimeline'

const SESSION = 'sess-1'

const change = (
  c: Partial<DevboxEntityChangeFragment>
): DevboxEntityChangeFragment => ({
  instanceId: 'inst-1',
  sessionId: SESSION,
  op: DevboxDeltaOp.Patch,
  ...c,
})

const agentMessage = (
  id: string,
  text: string,
  extra: Partial<DevboxEntityFragment> = {}
): DevboxEntityFragment => ({
  id,
  sessionId: SESSION,
  type: DevboxEntityType.AgentMessage,
  position: 1,
  revision: 1,
  settled: true,
  message: {
    messageId: id,
    content: [{ type: DevboxContentBlockType.Text, text }],
  },
  ...extra,
})

const reduce = (
  actions: Parameters<typeof devboxTimelineReducer>[1][],
  store: DevboxTimelineStore = EMPTY_DEVBOX_TIMELINE
) => actions.reduce(devboxTimelineReducer, store)

const textOf = (store: DevboxTimelineStore, id: string) => {
  const content =
    store.sessions[SESSION]?.entities[
      entityKey(DevboxEntityType.AgentMessage, id)
    ]?.message?.content ?? []
  return content.map((b) => (b && 'text' in b ? b.text : '')).join('')
}

const page = (entities: DevboxEntityFragment[], deltaOffset = 10) =>
  ({
    type: 'page',
    sessionId: SESSION,
    page: { entities, deltaOffset, hasMore: true },
  }) as const

const numberedPage = (
  entities: DevboxEntityFragment[],
  seq: number,
  stream = 'run-1'
) =>
  ({
    type: 'page',
    sessionId: SESSION,
    page: { entities, deltaOffset: 100, seq, stream, hasMore: false },
  }) as const

// numbered appends to message `a`; offsets deliberately run backwards, since
// they're instance-wide and don't order a session's deltas
const chunk = (seq: number, text: string, stream = 'run-1') =>
  ({
    type: 'delta',
    change: change({
      op: DevboxDeltaOp.Append,
      entityType: DevboxEntityType.AgentMessage,
      entityId: 'a',
      offset: 100 - seq,
      seq,
      stream,
      payload: { content: { type: 'text', text } },
    }),
  }) as const

describe('devboxTimelineReducer ordering', () => {
  it('reconstructs a session from deltas delivered out of order', () => {
    const store = reduce([
      numberedPage([agentMessage('a', 'a')], 2),
      chunk(5, ' d'),
      chunk(4, ' c'),
      chunk(3, ' b'),
    ])
    const session = store.sessions[SESSION]
    expect(textOf(store, 'a')).toBe('a b c d')
    expect(session.seq).toBe(5)
    expect(session.pending).toEqual({})
    expect(session.stale).toBe(false)
  })

  it('holds deltas past a gap and drops ones the page already has', () => {
    const loaded = reduce([numberedPage([agentMessage('a', 'a b')], 3)])
    expect(reduce([chunk(3, ' b')], loaded)).toBe(loaded)

    const held = reduce([chunk(5, ' d')], loaded)
    expect(textOf(held, 'a')).toBe('a b')
    expect(Object.keys(held.sessions[SESSION].pending)).toEqual(['5'])

    // the reloaded page covers the gap; the held delta applies on top of it
    const resynced = reduce(
      [numberedPage([agentMessage('a', 'a b c')], 4)],
      held
    )
    expect(textOf(resynced, 'a')).toBe('a b c d')
    expect(resynced.sessions[SESSION].seq).toBe(5)
  })

  it('replays only the buffered deltas past the first page', () => {
    const store = reduce([
      chunk(3, ' c'),
      chunk(2, ' b'),
      numberedPage([agentMessage('a', 'a b')], 2),
    ])
    expect(textOf(store, 'a')).toBe('a b c')
    expect(store.sessions[SESSION].seq).toBe(3)
  })

  it('reloads when a new daemon run starts numbering again', () => {
    const loaded = reduce([
      numberedPage([agentMessage('a', 'a')], 7),
      chunk(9, ' x'),
    ])
    const restarted = reduce([chunk(1, ' new', 'run-2')], loaded)
    expect(restarted.sessions[SESSION].stale).toBe(true)
    expect(textOf(restarted, 'a')).toBe('a')

    const reloaded = reduce(
      [
        numberedPage([agentMessage('a', 'a new')], 1, 'run-2'),
        chunk(2, '!', 'run-2'),
      ],
      restarted
    )
    const session = reloaded.sessions[SESSION]
    expect(session.stale).toBe(false)
    expect(session.stream).toBe('run-2')
    expect(session.pending).toEqual({})
    expect(textOf(reloaded, 'a')).toBe('a new!')
  })

  it('keeps older pages from moving where deltas resume', () => {
    const loaded = reduce([
      numberedPage([agentMessage('a', 'a')], 4),
      chunk(6, ' x'),
    ])
    const older = devboxTimelineReducer(loaded, {
      type: 'page',
      sessionId: SESSION,
      page: {
        entities: [agentMessage('z', 'old', { position: 0 })],
        seq: 1,
        stream: 'run-1',
      },
      older: true,
    })
    expect(older.sessions[SESSION].seq).toBe(4)
    expect(Object.keys(older.sessions[SESSION].pending)).toEqual(['6'])
  })
})

describe('devboxTimelineReducer', () => {
  it('loads a page of entities in position order', () => {
    const store = reduce([
      page([
        agentMessage('b', 'second', { position: 2 }),
        agentMessage('a', 'first', { position: 1 }),
      ]),
    ])
    const session = store.sessions[SESSION]
    expect(session.loaded).toBe(true)
    expect(session.hasMore).toBe(true)
    expect(session.deltaOffset).toBe(10)
    expect(selectOrderedEntities(session).map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('buffers deltas received before the first page and replays newer ones', () => {
    const store = reduce([
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Append,
          entityType: DevboxEntityType.AgentMessage,
          entityId: 'a',
          offset: 9,
          payload: { content: { type: 'text', text: ' stale' } },
        }),
      },
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Append,
          entityType: DevboxEntityType.AgentMessage,
          entityId: 'a',
          offset: 11,
          payload: { content: { type: 'text', text: ' world' } },
        }),
      },
    ])
    expect(store.sessions[SESSION].loaded).toBe(false)
    expect(store.sessions[SESSION].buffered).toHaveLength(2)

    const loaded = reduce([page([agentMessage('a', 'hello')])], store)
    expect(loaded.sessions[SESSION].buffered).toHaveLength(0)
    expect(textOf(loaded, 'a')).toBe('hello world')
    expect(loaded.sessions[SESSION].deltaOffset).toBe(11)
  })

  it('skips deltas at or below the loaded offset', () => {
    const loaded = reduce([page([agentMessage('a', 'hello')])])
    const next = reduce(
      [
        {
          type: 'delta',
          change: change({
            op: DevboxDeltaOp.Append,
            entityType: DevboxEntityType.AgentMessage,
            entityId: 'a',
            offset: 10,
            payload: { content: { type: 'text', text: ' dup' } },
          }),
        },
      ],
      loaded
    )
    expect(next).toBe(loaded)
  })

  it('creates live entities from appends and patches them', () => {
    const store = reduce([
      page([]),
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Patch,
          entityType: DevboxEntityType.ToolCall,
          entityId: 'tc',
          position: 3,
          offset: 11,
          payload: { title: 'Edit file', status: 'in_progress' },
        }),
      },
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Patch,
          entityType: DevboxEntityType.ToolCall,
          entityId: 'tc',
          offset: 12,
          payload: {
            status: 'completed',
            content: [{ type: 'diff', path: 'a.ts', newText: 'x' }],
          },
        }),
      },
    ])
    const tool =
      store.sessions[SESSION].entities[
        entityKey(DevboxEntityType.ToolCall, 'tc')
      ]
    expect(tool.settled).toBe(false)
    expect(tool.toolCall?.title).toBe('Edit file')
    expect(tool.toolCall?.status).toBe('completed')
    expect(tool.toolCall?.content?.[0]).toMatchObject({ path: 'a.ts' })
  })

  it('settles an entity with the archived copy', () => {
    const store = reduce([
      page([]),
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Append,
          entityType: DevboxEntityType.AgentMessage,
          entityId: 'a',
          offset: 11,
          payload: { content: { type: 'text', text: 'partial' } },
        }),
      },
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Settle,
          offset: 12,
          entity: agentMessage('a', 'final text', { revision: 2 }),
        }),
      },
    ])
    const entity =
      store.sessions[SESSION].entities[
        entityKey(DevboxEntityType.AgentMessage, 'a')
      ]
    expect(entity.settled).toBe(true)
    expect(textOf(store, 'a')).toBe('final text')
    expect(store.sessions[SESSION].deltaOffset).toBe(12)
  })

  it('repairs an entity whose chunks were missed with a settle that arrives late', () => {
    const append = (offset: number, text: string) =>
      ({
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Append,
          entityType: DevboxEntityType.AgentMessage,
          entityId: 'a',
          offset,
          payload: { content: { type: 'text', text } },
        }),
      }) as const
    const store = reduce([
      page([]),
      append(12, '.'),
      append(11, 'I added a comment'),
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.State,
          stateKind: 'state_update',
          offset: 14,
        }),
      },
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Settle,
          offset: 13,
          entity: agentMessage('a', 'I added a comment.', { revision: 1 }),
        }),
      },
    ])
    expect(textOf(store, 'a')).toBe('I added a comment.')
    expect(store.sessions[SESSION].deltaOffset).toBe(14)
  })

  it('keeps a newer live revision over an older settle or page', () => {
    const store = reduce([
      page([agentMessage('a', 'newer', { revision: 5 })]),
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Settle,
          offset: 11,
          entity: agentMessage('a', 'older', { revision: 3 }),
        }),
      },
      {
        type: 'page',
        sessionId: SESSION,
        older: true,
        page: { entities: [agentMessage('a', 'oldest', { revision: 1 })] },
      },
    ])
    expect(textOf(store, 'a')).toBe('newer')
  })

  it('tracks state deltas per kind', () => {
    const store = reduce([
      page([]),
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.State,
          stateKind: 'current_mode_update',
          offset: 11,
          payload: { currentModeId: 'plan' },
        }),
      },
    ])
    expect(store.sessions[SESSION].state.current_mode_update).toEqual({
      currentModeId: 'plan',
    })
  })

  it('collects notices until dismissed and dedupes pull requests', () => {
    const store = reduce([
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.Notice,
          payload: { kind: 'idle_warning' },
        }),
      },
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.PullRequest,
          threadId: 't1',
          position: 4,
          payload: { id: 'pr1', url: 'https://github.com/a/b/pull/1' },
        }),
      },
      {
        type: 'delta',
        change: change({
          op: DevboxDeltaOp.PullRequest,
          payload: { id: 'pr1', url: 'https://github.com/a/b/pull/1' },
        }),
      },
    ])
    expect(store.notices).toHaveLength(1)
    expect(store.pullRequests).toEqual([
      expect.objectContaining({ id: 'pr1', threadId: 't1', position: 4 }),
    ])
    const dismissed = devboxTimelineReducer(store, {
      type: 'dismissNotice',
      key: store.notices[0].key,
    })
    expect(dismissed.notices).toHaveLength(0)
  })
})
