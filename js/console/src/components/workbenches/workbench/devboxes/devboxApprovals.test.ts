import {
  DevboxEntityType,
  DevboxToolCallContentType,
  DevboxToolCallFragment,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { approvalPreview, attributeInteractions } from './devboxApprovals'
import {
  DevboxTimelineAction,
  devboxTimelineReducer,
  EMPTY_DEVBOX_TIMELINE,
} from './devboxTimeline'

describe('attributeInteractions', () => {
  const toolCallPage = (
    sessionId: string,
    toolCallId: string
  ): DevboxTimelineAction => ({
    type: 'page',
    sessionId,
    page: {
      entities: [
        {
          id: toolCallId,
          sessionId,
          type: DevboxEntityType.ToolCall,
          position: 1,
          revision: 1,
          settled: false,
          toolCall: { toolCallId },
        },
      ],
      deltaOffset: 10,
      hasMore: false,
    },
  })
  const store = [
    toolCallPage('parent-sess', 'parent-call'),
    toolCallPage('sub-sess', 'sub-call'),
  ].reduce(devboxTimelineReducer, EMPTY_DEVBOX_TIMELINE)
  const threads = [
    { id: 'parent', sessionId: 'parent-sess', title: 'Parent' },
    { id: 'sub', sessionId: 'sub-sess', title: 'Explore' },
  ]
  const onParent = (toolCallId: string) => ({
    toolCallId,
    thread: { id: 'parent', sessionId: 'parent-sess' },
  })

  it("files a request raised on the parent under the subagent whose call it's for", () => {
    expect(
      attributeInteractions([onParent('sub-call')], threads, store)[0].thread
    ).toMatchObject({ id: 'sub', sessionId: 'sub-sess' })
  })

  it('keeps the recorded thread when its own transcript holds the call, or none does', () => {
    expect(
      attributeInteractions(
        [onParent('parent-call'), onParent('unloaded')],
        threads,
        store
      ).map((i) => i.thread.id)
    ).toEqual(['parent', 'parent'])
  })
})

const call = (attrs: Partial<DevboxToolCallFragment>) =>
  ({ toolCallId: 'tc-1', ...attrs }) as DevboxToolCallFragment

describe('approvalPreview', () => {
  it('shows an edit as the diff the agent attached', () => {
    expect(
      approvalPreview(
        call({
          kind: 'edit',
          title: 'Edit console/README.md',
          content: [
            {
              __typename: 'DevboxToolCallDiff',
              type: DevboxToolCallContentType.Diff,
              path: '/home/dev/console/README.md',
              oldText: '# Registry cache test - run 2',
              newText: '',
            },
          ],
        })
      )
    ).toEqual({
      kind: 'edit',
      diffs: [
        {
          path: '/home/dev/console/README.md',
          oldText: '# Registry cache test - run 2',
          newText: '',
        },
      ],
    })
  })

  it("rebuilds the diff from Claude's edit and write inputs", () => {
    expect(
      approvalPreview(
        call({
          kind: 'edit',
          rawInput: {
            file_path: '/home/dev/a.go',
            old_string: 'foo',
            new_string: 'bar',
          },
        })
      )
    ).toEqual({
      kind: 'edit',
      diffs: [{ path: '/home/dev/a.go', oldText: 'foo', newText: 'bar' }],
    })
    expect(
      approvalPreview(
        call({ rawInput: { file_path: '/home/dev/new.md', content: '# hi' } })
      )
    ).toEqual({
      kind: 'edit',
      diffs: [{ path: '/home/dev/new.md', oldText: '', newText: '# hi' }],
    })
  })

  it('shows a command with its directory and description', () => {
    expect(
      approvalPreview(
        call({
          kind: 'execute',
          rawInput: {
            command: 'rm -rf node_modules',
            description: 'Clear dependencies',
            cwd: '/home/dev/console',
          },
        })
      )
    ).toEqual({
      kind: 'command',
      command: 'rm -rf node_modules',
      description: 'Clear dependencies',
      cwd: '/home/dev/console',
    })
    expect(
      approvalPreview(call({ kind: 'execute', title: '`git push`' }))
    ).toMatchObject({ kind: 'command', command: 'git push' })
  })

  it('shows an MCP call as its server, tool and arguments', () => {
    expect(
      approvalPreview(
        call({
          title: 'mcp__plural__get_cluster',
          rawInput: { handle: 'prod' },
        })
      )
    ).toEqual({
      kind: 'mcp',
      server: 'plural',
      tool: 'get_cluster',
      args: { handle: 'prod' },
    })
  })

  it('falls back to the raw input, or nothing without one', () => {
    expect(
      approvalPreview(call({ title: 'Fetch', rawInput: { url: 'x' } }))
    ).toEqual({ kind: 'generic', input: { url: 'x' } })
    expect(approvalPreview(call({ title: 'Something' }))).toBeNull()
    expect(approvalPreview(null)).toBeNull()
  })
})
