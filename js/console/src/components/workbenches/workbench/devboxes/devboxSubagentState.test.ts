import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxForegroundState,
  DevboxInteractionState,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  activeSubagents,
  latestActivity,
  subagentState,
  subagentsBySpawner,
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

describe('activeSubagents', () => {
  it('keeps working subagents, the ones needing you first', () => {
    const running = subagent('run', DevboxForegroundState.Running)
    const done = subagent('done', DevboxForegroundState.Idle)
    const asking = subagent('ask', DevboxForegroundState.Running)
    expect(
      activeSubagents([running, done, asking], [pending('ask')]).map(
        (s) => s.id
      )
    ).toEqual(['ask', 'run'])
  })
})

describe('latestActivity', () => {
  const message = (text: string) =>
    ({
      type: DevboxEntityType.AgentMessage,
      message: { content: [{ __typename: 'DevboxTextContent', text }] },
    }) as unknown as DevboxEntityFragment
  const tool = (title: string) =>
    ({
      type: DevboxEntityType.ToolCall,
      toolCall: { title },
    }) as unknown as DevboxEntityFragment

  it('is the newest message or tool call', () => {
    expect(latestActivity([message('looking'), tool('Read  file.ts')])).toBe(
      'Read  file.ts'
    )
    expect(latestActivity([tool('Grep'), message('found\n it')])).toBe(
      'found it'
    )
    expect(latestActivity([])).toBeUndefined()
  })
})

describe('subagentsBySpawner', () => {
  it('keys subagents by the tool call that spawned them', () => {
    const s = subagent('s1', DevboxForegroundState.Running, {
      parentToolCallId: 'task-1',
    })
    const map = subagentsBySpawner([
      s,
      subagent('s2', DevboxForegroundState.Running),
    ])
    expect([...map.keys()]).toEqual(['task-1'])
    expect(map.get('task-1')).toBe(s)
  })
})
