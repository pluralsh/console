import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  DevboxContentBlockType,
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxToolCallContentType,
} from 'generated/graphql'
import { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { DevboxTranscript } from './DevboxTranscript'
import { acpContentBlock, acpToolCallContent } from './devboxTimeline'

vi.mock('components/ai/chatbot/ChatMarkdown', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ChatMarkdown: ({ text }: { text: string }) => <p>{text}</p>,
}))

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterAll(() => vi.unstubAllGlobals())

const renderTranscript = (node: ReactNode) =>
  render(<ThemeProvider theme={styledThemeDark}>{node}</ThemeProvider>)

const entity = (
  e: Partial<DevboxEntityFragment> & Pick<DevboxEntityFragment, 'type'>
): DevboxEntityFragment => ({
  id: `${e.type}-${e.position ?? 0}`,
  sessionId: 's',
  settled: true,
  ...e,
})

const text = (t: string) => ({
  __typename: 'DevboxTextContent' as const,
  type: DevboxContentBlockType.Text,
  text: t,
})

const kindsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-entity]')].map((n) =>
    n.getAttribute('data-entity')
  )

describe('DevboxTranscript', () => {
  it('renders each known entity kind', () => {
    const { container } = renderTranscript(
      <DevboxTranscript
        entities={[
          entity({
            type: DevboxEntityType.UserMessage,
            position: 1,
            message: { content: [text('fix the build')] },
          }),
          entity({
            type: DevboxEntityType.AgentMessage,
            position: 2,
            message: { content: [text('On it')] },
          }),
          entity({
            type: DevboxEntityType.ToolCall,
            position: 3,
            toolCall: {
              toolCallId: 'tc',
              title: 'Edit main.ts',
              kind: 'edit',
              status: 'completed',
              locations: [{ path: 'src/main.ts', line: 4 }],
              content: [
                {
                  __typename: 'DevboxToolCallDiff',
                  type: DevboxToolCallContentType.Diff,
                  path: 'src/main.ts',
                  oldText: 'a',
                  newText: 'b',
                },
                {
                  __typename: 'DevboxToolCallTerminal',
                  type: DevboxToolCallContentType.Terminal,
                  terminalId: 'term-1',
                },
              ],
            },
          }),
          entity({
            type: DevboxEntityType.Terminal,
            position: 4,
            terminal: { terminalId: 'term-1', output: 'hidden' },
          }),
          entity({
            type: DevboxEntityType.Plan,
            position: 5,
            plan: {
              entries: [
                { content: 'Find bug', status: 'completed' },
                { content: 'Fix bug', status: 'pending', priority: 'high' },
              ],
            },
          }),
          entity({
            type: DevboxEntityType.Terminal,
            position: 6,
            terminal: {
              terminalId: 'term-2',
              command: 'yarn',
              args: ['build'],
              output: 'built',
              exitCode: 0,
            },
          }),
        ]}
        terminal={(id) =>
          id === 'term-1' ? { terminalId: id, output: 'ok', exitCode: 0 } : null
        }
      />
    )
    expect(kindsOf(container)).toEqual([
      'user-message',
      'agent-message',
      'tool-call',
      'plan',
      'terminal',
    ])
    expect(screen.getByText('fix the build')).toBeTruthy()
    expect(screen.getByText('On it')).toBeTruthy()
    const diff = container.querySelector('[data-content="diff"]')
    expect(diff?.textContent).toContain('src/main.ts')
    expect(diff?.textContent).toContain('+1')
    expect(screen.queryByText('hidden')).toBeNull()
    expect(screen.getByText('Plan · 1/2')).toBeTruthy()
    expect(screen.getByText('Fix bug')).toBeTruthy()
    expect(container.textContent).toContain('yarn build')
  })

  it('groups consecutive tool calls and keeps commands standalone', () => {
    const tool = (
      position: number,
      kind: string,
      rawInput: Record<string, unknown>
    ) =>
      entity({
        type: DevboxEntityType.ToolCall,
        position,
        toolCall: {
          toolCallId: `tc-${position}`,
          kind,
          status: 'completed',
          rawInput,
          content: [],
        },
      })
    const { container } = renderTranscript(
      <DevboxTranscript
        entities={[
          tool(1, 'read', { file_path: 'a.ts' }),
          tool(2, 'read', { file_path: 'b.ts' }),
          tool(3, 'search', { pattern: 'foo' }),
          tool(4, 'execute', { command: 'ls -la' }),
          tool(5, 'read', { file_path: 'c.ts' }),
          tool(6, 'edit', {
            file_path: 'c.ts',
            old_string: 'foo',
            new_string: 'bar',
          }),
          tool(7, 'read', { file_path: 'd.ts' }),
        ]}
      />
    )
    expect(screen.getByText('2 reads, 1 grep')).toBeTruthy()
    expect(screen.queryByText('a.ts')).toBeNull()
    expect(container.textContent).toContain('ls -la')
    expect(
      container.querySelector('[data-content="diff"]')?.textContent
    ).toContain('c.ts')
  })

  it('leaves out tool calls shown elsewhere', () => {
    const edit = (toolCallId: string, position: number) =>
      entity({
        type: DevboxEntityType.ToolCall,
        position,
        toolCall: {
          toolCallId,
          kind: 'edit',
          status: 'pending',
          rawInput: {
            file_path: `${toolCallId}.ts`,
            old_string: 'a',
            new_string: 'b',
          },
          content: [],
        },
      })
    const { container } = renderTranscript(
      <DevboxTranscript
        entities={[edit('shown', 1), edit('awaiting', 2)]}
        hiddenToolCalls={new Set(['awaiting'])}
      />
    )
    const diffs = [...container.querySelectorAll('[data-content="diff"]')]
    expect(diffs.map((d) => d.textContent?.includes('shown.ts'))).toEqual([
      true,
    ])
  })

  it('renders unknown entity, content and tool content variants generically', () => {
    const { container } = renderTranscript(
      <DevboxTranscript
        entities={[
          entity({
            type: DevboxEntityType.Unknown,
            position: 1,
            raw: { sessionUpdate: 'future_update', detail: 'xyz' },
          }),
          entity({
            type: DevboxEntityType.AgentMessage,
            position: 2,
            message: {
              content: [acpContentBlock({ type: 'hologram', beam: 42 })],
            },
          }),
          entity({
            type: DevboxEntityType.ToolCall,
            position: 3,
            toolCall: {
              toolCallId: 'tc',
              title: 'Mystery tool',
              status: 'failed',
              content: [acpToolCallContent({ type: 'widget', size: 3 })],
            },
          }),
        ]}
      />
    )
    expect(screen.getByText('UNKNOWN entity')).toBeTruthy()
    expect(screen.getByText('hologram content')).toBeTruthy()
    expect(container.textContent).toContain('future_update')
    expect(container.textContent).toContain('"beam": 42')
    fireEvent.click(screen.getByText('Mystery tool'))
    expect(screen.getByText('widget tool content')).toBeTruthy()
    expect(container.querySelectorAll('[data-entity="generic"]')).toHaveLength(
      3
    )
  })

  it('attributes Codex guardian reviews to the reviewer', () => {
    renderTranscript(
      <DevboxTranscript
        entities={[
          entity({
            type: DevboxEntityType.ToolCall,
            position: 1,
            toolCall: {
              toolCallId: 'guardian_assessment:r1',
              title: 'Guardian Review',
              kind: 'think',
              status: 'completed',
              content: [],
            },
          }),
          entity({
            type: DevboxEntityType.ToolCall,
            position: 2,
            toolCall: {
              toolCallId: 'guardian_assessment:r2',
              title: 'Guardian Review',
              kind: 'think',
              status: 'failed',
              content: [],
            },
          }),
        ]}
      />
    )
    expect(screen.getByText('Approved by Codex reviewer')).toBeTruthy()
    expect(screen.getByText('Not approved by Codex reviewer')).toBeTruthy()
    expect(screen.queryByText('Guardian Review')).toBeNull()
    expect(screen.queryByText('think')).toBeNull()
  })

  it('puts a subagent in place of the tool call that spawned it', () => {
    const { container } = renderTranscript(
      <DevboxTranscript
        entities={[
          entity({
            type: DevboxEntityType.AgentMessage,
            position: 1,
            message: { content: [text('delegating')] },
          }),
          entity({
            type: DevboxEntityType.ToolCall,
            position: 2,
            toolCall: {
              toolCallId: 'task-1',
              title: 'Explore the repo',
              kind: 'think',
              status: 'in_progress',
              content: [],
            },
          }),
          entity({
            type: DevboxEntityType.AgentMessage,
            position: 3,
            message: { content: [text('done')] },
          }),
        ]}
        subagents={[
          {
            id: 'thread-child',
            sessionId: 'parent/subagent/task-1',
            parentToolCallId: 'task-1',
          } as never,
        ]}
        renderSubagent={(s) => <span>card {s.id}</span>}
      />
    )
    expect(kindsOf(container)).toEqual([
      'agent-message',
      'subagent',
      'agent-message',
    ])
    expect(screen.getByText('card thread-child')).toBeTruthy()
  })

  it('puts a subagent in place of the session message that starts it', () => {
    const { container } = renderTranscript(
      <DevboxTranscript
        entities={[
          entity({
            type: DevboxEntityType.SessionMessage,
            position: 1,
            sessionMessage: { toSessionId: 'child', content: [text('go')] },
          }),
          entity({
            type: DevboxEntityType.AgentMessage,
            position: 2,
            message: { content: [text('done')] },
          }),
          entity({
            type: DevboxEntityType.SessionMessage,
            position: 3,
            sessionMessage: { toSessionId: 'child', content: [text('more')] },
          }),
        ]}
        subagents={[
          {
            id: 'thread-child',
            sessionId: 'child',
            title: 'Researcher',
          } as never,
        ]}
        renderSubagent={(s) => <span>card {s.id}</span>}
      />
    )
    expect(kindsOf(container)).toEqual([
      'subagent',
      'agent-message',
      'session-message',
    ])
    expect(screen.getByText('card thread-child')).toBeTruthy()
  })
})
