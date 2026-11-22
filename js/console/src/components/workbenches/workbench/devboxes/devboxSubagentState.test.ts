import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxForegroundState,
  DevboxInteractionState,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  latestToolCall,
  spawnTask,
  subagentState,
  subagentsBySpawner,
  subagentSummary,
} from './devboxSubagentState'

const subagent = (
  id: string,
  foregroundState: DevboxForegroundState,
  extra: { stopReason?: string; parentToolCallId?: string } = {}
) => ({ id, foregroundState, error: null, stopReason: null, ...extra })

const pending = (threadId: string) => ({
  state: DevboxInteractionState.Pending,
  thread: { id: threadId },
})

describe('subagentState', () => {
  it('needs you while one of its questions is pending', () => {
    expect(
      subagentState(subagent('s1', DevboxForegroundState.Running), [
        pending('s1'),
      ])
    ).toBe('needs you')
    expect(
      subagentState(subagent('s1', DevboxForegroundState.Running), [
        pending('s2'),
        { state: DevboxInteractionState.Answered, thread: { id: 's1' } },
      ])
    ).toBe('running')
  })

  it('tells a failed run from a finished one', () => {
    expect(
      subagentState(
        subagent('s1', DevboxForegroundState.Idle, { stopReason: 'error' }),
        []
      )
    ).toBe('failed')
    expect(subagentState(subagent('s1', DevboxForegroundState.Idle), [])).toBe(
      'done'
    )
  })
})

const text = (type: DevboxEntityType, value: string) =>
  ({
    type,
    message: { content: [{ __typename: 'DevboxTextContent', text: value }] },
  }) as unknown as DevboxEntityFragment
const tool = (title: string) =>
  ({
    type: DevboxEntityType.ToolCall,
    toolCall: { title },
  }) as unknown as DevboxEntityFragment

describe('subagentSummary', () => {
  const entities = [
    text(DevboxEntityType.UserMessage, 'explore the\n api'),
    text(DevboxEntityType.AgentMessage, 'looking'),
    tool('Read file.ts'),
    text(DevboxEntityType.AgentMessage, 'found it'),
  ]

  it('is the task while running and the answer once done', () => {
    expect(subagentSummary(entities, true)).toBe('explore the api')
    expect(subagentSummary(entities, false)).toBe('found it')
  })

  it('falls back to whichever it has', () => {
    expect(subagentSummary(entities.slice(1), true)).toBe('found it')
    expect(subagentSummary(entities.slice(0, 1), false)).toBe('explore the api')
    expect(subagentSummary([], true)).toBeUndefined()
  })
})

describe('spawnTask', () => {
  it("reads the task off the spawning tool call's input or spawn message", () => {
    const agentCall = {
      type: DevboxEntityType.ToolCall,
      toolCall: {
        rawInput: { description: 'Explore apps', prompt: 'look at\n apps/' },
      },
    } as unknown as DevboxEntityFragment
    expect(spawnTask(agentCall)).toBe('look at apps/')
    const spawn = {
      type: DevboxEntityType.SessionMessage,
      sessionMessage: {
        content: [{ __typename: 'DevboxTextContent', text: 'list files' }],
      },
    } as unknown as DevboxEntityFragment
    expect(spawnTask(spawn)).toBe('list files')
    expect(spawnTask(undefined)).toBeUndefined()
  })

  it('is the summary until the subagent answers', () => {
    const agentCall = {
      type: DevboxEntityType.ToolCall,
      toolCall: { rawInput: { prompt: 'explore' } },
    } as unknown as DevboxEntityFragment
    expect(subagentSummary([tool('ls')], false, agentCall)).toBe('explore')
    expect(
      subagentSummary(
        [text(DevboxEntityType.AgentMessage, 'done')],
        false,
        agentCall
      )
    ).toBe('done')
  })
})

describe('latestToolCall', () => {
  it('is the newest tool call', () => {
    expect(
      latestToolCall([tool('Grep'), text(DevboxEntityType.AgentMessage, 'x')])
        ?.title
    ).toBe('Grep')
    expect(latestToolCall([])).toBeUndefined()
  })
})

describe('subagentsBySpawner', () => {
  it('groups subagents by the tool call that spawned them', () => {
    const s1 = subagent('s1', DevboxForegroundState.Running, {
      parentToolCallId: 'task-1',
    })
    const s3 = subagent('s3', DevboxForegroundState.Running, {
      parentToolCallId: 'task-1',
    })
    const map = subagentsBySpawner([
      s1,
      subagent('s2', DevboxForegroundState.Running),
      s3,
    ])
    expect([...map.keys()]).toEqual(['task-1'])
    expect(map.get('task-1')).toEqual([s1, s3])
  })
})
