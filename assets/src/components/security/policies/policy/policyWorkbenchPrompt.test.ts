import { describe, expect, it } from 'vitest'
import {
  buildPolicyWorkbenchPrompt,
  POLICY_UPDATE_PLACEHOLDER,
} from './policyWorkbenchPrompt'

describe('buildPolicyWorkbenchPrompt', () => {
  it('includes the policy name, fenced rego, fenced json, and update placeholder', () => {
    const prompt = buildPolicyWorkbenchPrompt({
      name: 'kubernetes-guardrails',
      policy: 'package plrl.wb.admission\n\ndeny contains msg if {\n  true\n}',
      input: '{\n  "tool_name": "workbench_notes"\n}',
    })

    expect(prompt).toContain('named kubernetes-guardrails')
    expect(prompt).toContain(POLICY_UPDATE_PLACEHOLDER)
    expect(prompt).toContain('```rego\npackage plrl.wb.admission')
    expect(prompt).toContain(
      '```json\n{\n  "tool_name": "workbench_notes"\n}\n```'
    )
  })

  it('omits the name clause when the policy is unnamed', () => {
    const prompt = buildPolicyWorkbenchPrompt({
      policy: 'package example',
      input: '{}',
    })

    expect(prompt).toContain('Update this Plural policy.')
    expect(prompt).not.toContain('named')
    expect(prompt).toContain('```rego\npackage example\n```')
    expect(prompt).toContain('```json\n{}\n```')
  })
})
