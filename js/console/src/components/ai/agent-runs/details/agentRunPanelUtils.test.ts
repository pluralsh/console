import { describe, expect, it } from 'vitest'
import {
  AgentRunPanelContent,
  hasAgentRunPanelContent,
} from './agentRunPanelUtils'

function panelContent(
  overrides: Partial<AgentRunPanelContent> = {}
): AgentRunPanelContent {
  return {
    analysis: null,
    pullRequests: [],
    todos: [],
    upload: null,
    ...overrides,
  }
}

describe('hasAgentRunPanelContent', () => {
  it('does not count an empty or whitespace-only plan as content', () => {
    expect(hasAgentRunPanelContent(null)).toBe(false)
    expect(
      hasAgentRunPanelContent(
        panelContent({
          todos: [{ title: '  ', description: '\n', done: false }],
        })
      )
    ).toBe(false)
  })

  it('detects an implementation plan', () => {
    expect(
      hasAgentRunPanelContent(
        panelContent({
          todos: [
            {
              title: 'Implement the change',
              description: '',
              done: false,
            },
          ],
        })
      )
    ).toBe(true)
  })

  it('detects a valid pull request', () => {
    expect(
      hasAgentRunPanelContent(
        panelContent({
          pullRequests: [
            {
              id: 'pr-1',
              url: 'https://example.com/pull/1',
              title: 'Implement the change',
            },
          ],
        })
      )
    ).toBe(true)
  })

  it('detects a diff or analysis', () => {
    expect(
      hasAgentRunPanelContent(
        panelContent({ upload: { id: 'upload-1', patch: 'diff --git' } })
      )
    ).toBe(true)
    expect(
      hasAgentRunPanelContent(
        panelContent({
          analysis: {
            summary: 'Summary',
            analysis: 'Detailed analysis',
            bullets: [],
          },
        })
      )
    ).toBe(true)
  })
})
