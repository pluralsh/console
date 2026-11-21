import {
  DevboxThreadFragment,
  DevboxThreadKind,
  DevboxThreadStage,
  DevboxThreadStatus,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  buildThreadTree,
  groupThreadsByStage,
  threadTitle,
} from './devboxThreads'

describe('threadTitle', () => {
  it('shows file mentions by name', () => {
    expect(
      threadTitle({
        id: 't',
        title:
          'explain the readme in <plrl-devbox-file path="/home/plural/repo/README.md"></plrl-devbox-file> and <plrl-devbox-file path="/home/plural/repo/src/"></plrl-devbox-file>',
      })
    ).toBe('explain the readme in @README.md and @src')
  })
})

const thread = (
  id: string,
  stage: DevboxThreadStage,
  extra: Partial<DevboxThreadFragment> = {}
): DevboxThreadFragment => ({
  id,
  stage,
  kind: DevboxThreadKind.Thread,
  status: DevboxThreadStatus.Active,
  ...extra,
})

describe('groupThreadsByStage', () => {
  it('groups top-level threads by stage, needs review first, dropping empty stages', () => {
    const tree = buildThreadTree([
      thread('done', DevboxThreadStage.Completed, {
        status: DevboxThreadStatus.Closed,
        lastActivityAt: '2024-01-03',
      }),
      thread('ask', DevboxThreadStage.NeedsReview, {
        lastActivityAt: '2024-01-02',
      }),
      thread('sub', DevboxThreadStage.Running, {
        kind: DevboxThreadKind.Subagent,
        parent: { id: 'done' },
      }),
    ])

    const groups = groupThreadsByStage(tree)

    expect(groups.map((g) => g.stage)).toEqual([
      DevboxThreadStage.NeedsReview,
      DevboxThreadStage.Completed,
    ])
    expect(groups[1].threads[0].children.map((c) => c.id)).toEqual(['sub'])
  })
})
