import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { groupConsecutiveActivities } from './WorkbenchJobActivities'
import { CODING_AGENT_TOOL_NAME } from './workbenchJobActivityCollapse'

const activity = (
  id: string,
  type: WorkbenchJobActivityType,
  overrides: Partial<WorkbenchJobActivityFragment> = {}
): WorkbenchJobActivityFragment => ({
  id,
  type,
  status: WorkbenchJobActivityStatus.Successful,
  ...overrides,
})

const codingAgent = (id: string) =>
  activity(id, WorkbenchJobActivityType.Coding, {
    toolCall: { callId: id, name: CODING_AGENT_TOOL_NAME },
    agentRun: { id: `run-${id}` } as WorkbenchJobActivityFragment['agentRun'],
  })

const summarize = (activities: WorkbenchJobActivityFragment[]) =>
  groupConsecutiveActivities(activities).map(({ kind, activities }) => [
    kind,
    activities.map(({ id }) => id),
  ])

describe('groupConsecutiveActivities', () => {
  it('folds consecutive coding agent runs into one group', () => {
    expect(
      summarize([
        codingAgent('a'),
        codingAgent('b'),
        activity('c', WorkbenchJobActivityType.Infrastructure),
        codingAgent('d'),
      ])
    ).toEqual([
      ['codingAgent', ['a', 'b']],
      ['single', ['c']],
      ['codingAgent', ['d']],
    ])
  })

  it('keeps memos and coding agent runs in separate groups', () => {
    expect(
      summarize([
        activity('a', WorkbenchJobActivityType.Memo),
        activity('b', WorkbenchJobActivityType.Memo),
        codingAgent('c'),
        activity('d', WorkbenchJobActivityType.Memo),
      ])
    ).toEqual([
      ['memo', ['a', 'b']],
      ['codingAgent', ['c']],
      ['memo', ['d']],
    ])
  })

  it('leaves coding subagent activities ungrouped', () => {
    expect(
      summarize([
        activity('a', WorkbenchJobActivityType.Coding, {
          toolCall: { callId: 'a', name: 'workbench_subagent' },
          agentRun: { id: 'run-a' } as WorkbenchJobActivityFragment['agentRun'],
        }),
        activity('b', WorkbenchJobActivityType.Coding, {
          toolCall: { callId: 'b', name: 'workbench_subagent' },
        }),
      ])
    ).toEqual([
      ['single', ['a']],
      ['single', ['b']],
    ])
  })

  it('groups coding agent runs before their agent run is attached', () => {
    expect(
      summarize([
        codingAgent('a'),
        activity('b', WorkbenchJobActivityType.Coding, {
          status: WorkbenchJobActivityStatus.Pending,
          toolCall: { callId: 'b', name: CODING_AGENT_TOOL_NAME },
        }),
      ])
    ).toEqual([['codingAgent', ['a', 'b']]])
  })
})
