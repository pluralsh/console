import {
  DevboxToolCallContentType,
  DevboxToolCallFragment,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { approvalPreview } from './devboxApprovals'

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
