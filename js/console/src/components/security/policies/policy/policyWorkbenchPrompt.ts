import ejs from 'ejs'
import policyWorkbenchPromptTemplate from './policy-workbench-prompt.ejs?raw'

const renderPolicyWorkbenchPrompt = ejs.compile(policyWorkbenchPromptTemplate)

export const POLICY_UPDATE_PLACEHOLDER =
  '[Describe the policy update you want here]'

export function buildPolicyWorkbenchPrompt({
  name,
  policy,
  input,
}: {
  name?: Nullable<string>
  policy: string
  input: string
}): string {
  return renderPolicyWorkbenchPrompt({
    name: name?.trim() || undefined,
    policy,
    input,
  }).trim()
}
