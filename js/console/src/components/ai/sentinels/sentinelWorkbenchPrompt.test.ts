import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import {
  SentinelRunFragment,
  SentinelRunJobFormat,
  SentinelRunJobFragment,
  SentinelRunJobStatus,
  SentinelRunStatus,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  buildSentinelRunJobWorkbenchPrompt,
  buildSentinelRunWorkbenchPrompt,
} from './sentinelWorkbenchPrompt'

const junit = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="2" failures="1">
  <testsuite name="terratest" tests="2" failures="1">
    <testcase classname="terratest" name="TestCoreDNS"></testcase>
    <testcase classname="terratest" name="TestLoadBalancer">
      <failure message="dns probe for lb.example.com timed out"></failure>
    </testcase>
  </testsuite>
</testsuites>`

const job = {
  id: 'job-1',
  status: SentinelRunJobStatus.Failed,
  check: 'integration',
  format: SentinelRunJobFormat.Junit,
  output: junit,
  error: 'container "default" in pod p was OOMKilled',
  cluster: { id: 'cluster-1', name: 'prod', handle: 'prod-usw2', distro: null },
  reference: { namespace: 'plrl-sentinel', name: 'sentinel-job-1' },
  sentinelRun: { id: 'run-1', sentinel: { id: 'sentinel-1', name: 'smoke' } },
} as SentinelRunJobFragment

describe('buildSentinelRunJobWorkbenchPrompt', () => {
  it('embeds the job as a sentinel run job tag with its error and failing cases', () => {
    const prompt = buildSentinelRunJobWorkbenchPrompt(job)

    expect(prompt).toContain(`<${MentionKind.Cluster} item-id="cluster-1"`)
    expect(prompt).toContain(
      `<${MentionKind.SentinelRunJob} item-id="job-1" item-name="integration"`
    )
    expect(prompt).toContain('cluster-handle="prod-usw2"')
    expect(prompt).toContain('run-id="run-1"')
    expect(prompt).toContain('OOMKilled')
    expect(prompt).toContain(
      'FAIL terratest/TestLoadBalancer: dns probe for lb.example.com timed out'
    )
    expect(prompt).not.toContain('TestCoreDNS')
    expect(prettifyPrompt(prompt)).toContain('@integration (prod-usw2)')
  })
})

describe('buildSentinelRunWorkbenchPrompt', () => {
  it('embeds the run as a sentinel run tag with per-check results', () => {
    const prompt = buildSentinelRunWorkbenchPrompt({
      id: 'abcd1234-0000',
      status: SentinelRunStatus.Failed,
      sentinel: { id: 'sentinel-1', name: 'smoke' },
      results: [
        {
          name: 'integration',
          status: SentinelRunStatus.Failed,
          jobCount: 3,
          failedCount: 1,
        },
      ],
      errors: [{ source: 'runner', message: 'no clusters matched' }],
    } as SentinelRunFragment)

    expect(prompt).toContain(
      `<${MentionKind.SentinelRun} item-id="abcd1234-0000" item-name="smoke run-abcd1234"`
    )
    expect(prompt).toContain('integration: FAILED (1/3 jobs failed)')
    expect(prompt).toContain('runner: no clusters matched')
    expect(prettifyPrompt(prompt)).toContain('@smoke run-abcd1234')
  })
})
