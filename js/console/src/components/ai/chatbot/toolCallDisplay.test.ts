import { describe, expect, it } from 'vitest'
import {
  humanizeToolName,
  resolveToolCallKind,
  toolCallDisplaySubtitle,
  toolCallDisplayTitle,
  toolCallGroupHeader,
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

  it('does not classify integration tools containing read as file reads', () => {
    expect(resolveToolCallKind('Read', { path: 'README.md' })).toBe('read')
    expect(resolveToolCallKind('github_pull_request_read')).toBe('generic')
  })
})

describe('toolCallDisplayTitle', () => {
  it('uses Cursor-style verbs for common tools', () => {
    expect(toolCallDisplayTitle('subagent', 'workbench_subagent')).toBe(
      'subagent'
    )
    expect(toolCallDisplayTitle('read', 'Read')).toBe('read')
    expect(toolCallDisplayTitle('python_sandbox', 'python_sandbox')).toBe(
      'python sandbox'
    )
  })

  it('humanizes workbench snake_case tools', () => {
    expect(toolCallDisplayTitle('generic', 'plrl_logs')).toBe('logs')
    expect(
      toolCallDisplayTitle('generic', 'workbench_observability_metrics_datadog')
    ).toBe('metrics datadog')
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
    expect(humanizeToolName('workbench_subagent')).toBe('subagent')
    expect(humanizeToolName('workbench_activity_search')).toBe(
      'activity search'
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

  it('labels Python sandbox calls consistently', () => {
    expect(
      toolCallGroupHeader([
        { name: 'python_sandbox' },
        { name: 'python_sandbox' },
        { name: 'python_sandbox' },
      ])
    ).toBe('3 python sandboxes')
  })
})
