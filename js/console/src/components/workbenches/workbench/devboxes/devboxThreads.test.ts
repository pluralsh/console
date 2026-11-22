import {
  DevboxForegroundState,
  DevboxInteractionKind,
  DevboxThreadFragment,
  DevboxThreadKind,
  DevboxThreadStage,
  DevboxThreadStatus,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  buildThreadTree,
  groupThreadsByStage,
  rootThread,
  threadState,
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

describe('threadState', () => {
  const idle = {
    status: DevboxThreadStatus.Active,
    foregroundState: DevboxForegroundState.Idle,
  }

  it('awaits approval while a permission request is pending, even once idled', () => {
    expect(
      threadState(idle, [{ kind: DevboxInteractionKind.Permission }])
    ).toBe('awaiting approval')
  })

  it('needs you for other pending questions or a blocked foreground', () => {
    expect(
      threadState(idle, [{ kind: DevboxInteractionKind.FormElicitation }])
    ).toBe('needs you')
    expect(
      threadState({
        ...idle,
        foregroundState: DevboxForegroundState.RequiresAction,
      })
    ).toBe('needs you')
    expect(threadState(idle)).toBe('idle')
  })

  it('keeps closed threads closed', () => {
    expect(
      threadState({ ...idle, status: DevboxThreadStatus.Closed }, [
        { kind: DevboxInteractionKind.Permission },
      ])
    ).toBe('closed')
  })
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

describe('rootThread', () => {
  it('walks a subagent up to the thread it works for', () => {
    const top = thread('top', DevboxThreadStage.Running)
    const sub = thread('sub', DevboxThreadStage.Running, {
      kind: DevboxThreadKind.Subagent,
      parent: { id: 'top' },
    })
    const nested = thread('nested', DevboxThreadStage.Running, {
      kind: DevboxThreadKind.Subagent,
      parent: { id: 'sub' },
    })
    const orphan = thread('orphan', DevboxThreadStage.Running, {
      kind: DevboxThreadKind.Subagent,
      parent: { id: 'gone' },
    })
    const threads = [top, sub, nested, orphan]

    expect(rootThread(threads, nested)?.id).toBe('top')
    expect(rootThread(threads, top)?.id).toBe('top')
    expect(rootThread(threads, orphan)?.id).toBe('orphan')
    expect(rootThread(threads, undefined)).toBeUndefined()
  })
})
