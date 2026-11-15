import { styledThemeDark } from '@pluralsh/design-system'
import { render, screen } from '@testing-library/react'
import {
  DevboxContentBlockType,
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxToolCallContentType,
} from 'generated/graphql'
import { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { DevboxTranscript } from './DevboxTranscript'
import { acpContentBlock, acpToolCallContent } from './devboxTimeline'

vi.mock('components/ai/chatbot/ChatMarkdown', () => ({
  ChatMarkdown: ({ text }: { text: string }) => <p>{text}</p>,
}))

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
        ]}
        terminal={(id) =>
          id === 'term-1'
            ? {
                terminalId: id,
                command: 'yarn',
                args: ['build'],
                output: 'ok',
                exitCode: 0,
              }
            : null
        }
      />
    )
    const kinds = [...container.querySelectorAll('[data-entity]')].map((n) =>
      n.getAttribute('data-entity')
    )
    expect(kinds).toEqual([
      'user-message',
      'agent-message',
      'tool-call',
      'terminal',
      'plan',
    ])
    expect(screen.getByText('fix the build')).toBeTruthy()
    expect(screen.getByText('Edit main.ts')).toBeTruthy()
    expect(screen.getByText('src/main.ts:4')).toBeTruthy()
    expect(screen.getByText('yarn build')).toBeTruthy()
    expect(screen.getByText('exit 0')).toBeTruthy()
    expect(screen.queryByText('hidden')).toBeNull()
    expect(screen.getByText('Plan · 1/2')).toBeTruthy()
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
    expect(container.querySelectorAll('[data-entity="generic"]')).toHaveLength(
      3
    )
    expect(screen.getByText('UNKNOWN entity')).toBeTruthy()
    expect(screen.getByText(/future_update/)).toBeTruthy()
    expect(screen.getByText('hologram content')).toBeTruthy()
    expect(screen.getByText(/"beam": 42/)).toBeTruthy()
    expect(screen.getByText('widget tool content')).toBeTruthy()
  })

  it('places subagent lanes after the session message that links them', () => {
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
        ]}
        subagents={[
          {
            id: 'thread-child',
            sessionId: 'child',
            title: 'Researcher',
          } as never,
        ]}
        renderSubagentLane={(s) => <span>lane {s.id}</span>}
      />
    )
    const kinds = [...container.querySelectorAll('[data-entity]')].map((n) =>
      n.getAttribute('data-entity')
    )
    expect(kinds).toEqual(['session-message', 'subagent-lane', 'agent-message'])
    expect(screen.getByText('Subagent · Researcher')).toBeTruthy()
  })
})
