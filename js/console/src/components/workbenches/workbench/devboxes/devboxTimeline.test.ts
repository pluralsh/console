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
