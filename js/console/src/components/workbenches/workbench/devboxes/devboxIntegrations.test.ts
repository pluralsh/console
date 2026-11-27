import {
  DevboxToolCallFragment,
  Provider,
  WorkbenchToolType,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  commandIntegration,
  hostIntegration,
  mcpAction,
  mcpToolIndex,
  toolIntegration,
} from './devboxIntegrations'

const call = (c: Partial<DevboxToolCallFragment>) =>
  ({ toolCallId: 't1', ...c }) as DevboxToolCallFragment

const index = mcpToolIndex([
  {
    name: 'github_gh_close_pull_request',
    toolType: WorkbenchToolType.Github,
    workbenchToolId: 'wt-gh',
    workbenchToolName: 'gh',
  },
  {
    name: 'workbench_observability_metrics_prod-dd',
    toolType: WorkbenchToolType.Datadog,
    workbenchToolId: 'wt-dd',
    workbenchToolName: 'prod-dd',
  },
])

describe('toolIntegration', () => {
  it('resolves workbench MCP calls through the index, as Claude names them', () => {
    expect(
      toolIntegration(
        call({ title: 'mcp__plural-workbench__github_gh_close_pull_request' }),
        index
      )
    ).toEqual({
      type: WorkbenchToolType.Github,
      provider: undefined,
      workbenchToolId: 'wt-gh',
      workbenchToolName: 'gh',
      action: 'close pull request',
    })
  })

  it('tells observability providers apart, which their names cannot', () => {
    expect(
      toolIntegration(
        call({
          title: 'plural-workbench.workbench_observability_metrics_prod-dd',
          rawInput: {
            server: 'plural-workbench',
            tool: 'workbench_observability_metrics_prod-dd',
            arguments: {},
          },
        }),
        index
      )
    ).toMatchObject({ type: WorkbenchToolType.Datadog, action: 'metrics' })
  })

  it('falls back to the name prefix for tools the index no longer has', () => {
    expect(
      toolIntegration(
        call({ title: 'mcp__plural-workbench__jira_old_get_issue' }),
        index
      )
    ).toEqual({ type: WorkbenchToolType.Jira, action: 'old get issue' })
  })

  it('leaves builtins and other MCP servers alone', () => {
    expect(
      toolIntegration(
        call({ title: 'mcp__plural-workbench__plrl_logs' }),
        index
      )
    ).toBeNull()
    expect(
      toolIntegration(call({ title: 'mcp__devbox__list_pull_requests' }), index)
    ).toBeNull()
  })

  it('matches the CLI a command runs', () => {
    expect(
      toolIntegration(
        call({ kind: 'execute', rawInput: { command: 'gh pr list' } }),
        index
      )
    ).toEqual({ type: WorkbenchToolType.Github })
    expect(
      toolIntegration(
        call({
          kind: 'execute',
          rawInput: { command: ['bash', '-lc', 'aws s3 ls'] },
        }),
        index
      )
    ).toEqual({ type: WorkbenchToolType.Cloud, provider: Provider.Aws })
  })

  it('matches the host a fetch reaches', () => {
    expect(
      toolIntegration(
        call({
          kind: 'fetch',
          rawInput: { url: 'https://api.linear.app/graphql' },
        }),
        index
      )
    ).toEqual({ type: WorkbenchToolType.Linear })
  })
})

describe('commandIntegration', () => {
  it('looks past wrappers, env assignments and earlier pipeline stages', () => {
    expect(commandIntegration('cd repo && GH_PAGER= gh issue view 3')).toEqual({
      type: WorkbenchToolType.Github,
    })
    expect(commandIntegration('sudo /usr/local/bin/gcloud auth list')).toEqual({
      type: WorkbenchToolType.Cloud,
      provider: Provider.Gcp,
    })
  })

  it('separates Azure DevOps from Azure', () => {
    expect(commandIntegration('az repos pr list')).toEqual({
      type: WorkbenchToolType.AzureDevops,
    })
    expect(commandIntegration('az aks list')).toEqual({
      type: WorkbenchToolType.Cloud,
      provider: Provider.Azure,
    })
  })

  it('reads the URL curl fetches', () => {
    expect(
      commandIntegration(
        'curl -s -H "Authorization: x" "https://acme.atlassian.net/rest/api/3/issue/A-1"'
      )
    ).toEqual({ type: WorkbenchToolType.Jira })
  })

  it('ignores commands it has no integration for', () => {
    expect(commandIntegration('git status && ls -la')).toBeNull()
    expect(commandIntegration('curl https://example.com')).toBeNull()
  })
})

describe('hostIntegration', () => {
  it('matches parent domains and rejects look-alikes', () => {
    expect(hostIntegration('https://api.github.com/repos')).toEqual({
      type: WorkbenchToolType.Github,
    })
    expect(hostIntegration('https://notgithub.com')).toBeNull()
    expect(hostIntegration('not a url')).toBeNull()
  })
})

describe('mcpAction', () => {
  it('drops the type and the workbench tool name', () => {
    expect(mcpAction('github_my_repo_get_tag', 'my.repo')).toBe('get tag')
    expect(mcpAction('workbench_observability_logs_prom', 'prom')).toBe('logs')
    expect(mcpAction('slack_list_channels', 'chat')).toBe('slack list channels')
  })
})
