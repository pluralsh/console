import { describe, expect, it } from 'vitest'
import {
  humanizeToolName,
  resolveToolCallKind,
  toolCallDisplaySubtitle,
  toolCallDisplayTitle,
  toolCallGroupHeader,
  toolCallOpensInModal,
} from './toolCallDisplay'

describe('resolveToolCallKind', () => {
  it('recognizes workbench subagent tools', () => {
    expect(
      resolveToolCallKind('workbench_subagent', {
        subagent: 'infrastructure',
        prompt: 'inspect pods',
      })
    ).toBe('subagent')
    expect(resolveToolCallKind('subagent_result', { output: 'done' })).toBe(
      'subagent_result'
    )
    expect(resolveToolCallKind('enable_tools', { tools: ['plrl_logs'] })).toBe(
      'enable_tools'
    )
  })
})

describe('toolCallDisplayTitle', () => {
  it('uses Cursor-style verbs for common tools', () => {
    expect(toolCallDisplayTitle('subagent', 'workbench_subagent')).toBe(
      'Subagent'
    )
    expect(toolCallDisplayTitle('read', 'Read')).toBe('Read')
    expect(toolCallDisplayTitle('python_sandbox', 'python_sandbox')).toBe(
      'Python'
    )
  })

  it('humanizes workbench snake_case tools', () => {
    expect(toolCallDisplayTitle('generic', 'plrl_logs')).toBe('Logs')
    expect(
      toolCallDisplayTitle('generic', 'workbench_observability_metrics_datadog')
    ).toBe('Metrics Datadog')
  })
})

describe('toolCallDisplaySubtitle', () => {
  it('shows the subagent role and prompt', () => {
    expect(
      toolCallDisplaySubtitle('subagent', 'workbench_subagent', {
        subagent: 'infrastructure',
        prompt: 'Find CrashLoopBackOff pods in production',
      })
    ).toBe('Infrastructure · Find CrashLoopBackOff pods in production')
  })

  it('prefers path and query over the raw tool name', () => {
    expect(
      toolCallDisplaySubtitle('read', 'Read', { path: 'lib/console/ai.ex' })
    ).toBe('lib/console/ai.ex')
    expect(
      toolCallDisplaySubtitle('generic', 'plrl_logs', {
        query: '{namespace="prod"}',
      })
    ).toBe('{namespace="prod"}')
  })
})

describe('humanizeToolName', () => {
  it('strips workbench prefixes', () => {
    expect(humanizeToolName('workbench_subagent')).toBe('Subagent')
    expect(humanizeToolName('workbench_activity_search')).toBe(
      'Activity Search'
    )
  })
})

describe('toolCallGroupHeader', () => {
  it('counts subagents separately from other tool calls', () => {
    expect(
      toolCallGroupHeader([
        {
          name: 'workbench_subagent',
          arguments: { subagent: 'search', prompt: 'docs' },
        },
        {
          name: 'workbench_subagent',
          arguments: { subagent: 'infrastructure', prompt: 'pods' },
        },
        { name: 'plrl_logs', arguments: { query: 'error' } },
      ])
    ).toBe('1 tool call, 2 subagents')
  })
})

describe('toolCallOpensInModal', () => {
  it('opens MCP / enable / subagent_result in a modal', () => {
    expect(toolCallOpensInModal('mcp_tool_call')).toBe(true)
    expect(toolCallOpensInModal('enable_tools')).toBe(true)
    expect(toolCallOpensInModal('subagent_result')).toBe(true)
  })

  it('keeps transcript tools inline', () => {
    expect(toolCallOpensInModal('bash')).toBe(false)
    expect(toolCallOpensInModal('command_execution')).toBe(false)
    expect(toolCallOpensInModal('read')).toBe(false)
    expect(toolCallOpensInModal('edit')).toBe(false)
  })

  it('opens generic JSON payloads in a modal, not plain transcripts', () => {
    expect(toolCallOpensInModal('generic', '{}')).toBe(true)
    expect(toolCallOpensInModal('generic', '{"ok":true}')).toBe(true)
    expect(toolCallOpensInModal('generic', '')).toBe(true)
    expect(
      toolCallOpensInModal('generic', 'error: connection refused\nretrying...')
    ).toBe(false)
  })

  it('opens read/grep JSON API results in a modal', () => {
    expect(toolCallOpensInModal('read', '{"number":4066}')).toBe(true)
    expect(toolCallOpensInModal('read', 'export function foo() {}')).toBe(false)
    expect(toolCallOpensInModal('grep', 'match at line 12')).toBe(false)
  })

  it('detects fenced JSON payloads', () => {
    expect(toolCallOpensInModal('read', '```json\n{"ok":true}\n```')).toBe(true)
    expect(toolCallOpensInModal('bash', '{"status":"ok"}')).toBe(true)
    expect(toolCallOpensInModal('bash', 'done\n{"status":"ok"}')).toBe(false)
  })
})
