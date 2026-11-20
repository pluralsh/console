import { ButtonProps } from '@pluralsh/design-system'
import { SendToWorkbenchButton } from 'components/ai/insights/SendInsightToWorkbench'
import {
  SentinelRunFragment,
  SentinelRunJobFragment,
  SentinelRunJobStatus,
  SentinelRunStatus,
} from 'generated/graphql'
import { useMemo } from 'react'
import {
  buildSentinelRunJobWorkbenchPrompt,
  buildSentinelRunWorkbenchPrompt,
} from './sentinelWorkbenchPrompt'

export function SendSentinelRunJobToWorkbenchButton({
  job,
  ...props
}: { job: Nullable<SentinelRunJobFragment> } & ButtonProps) {
  const prompt = useMemo(
    () => (job ? buildSentinelRunJobWorkbenchPrompt(job) : ''),
    [job]
  )

  if (!job || (job.status !== SentinelRunJobStatus.Failed && !job.error))
    return null

  return (
    <SendToWorkbenchButton
      initialPrompt={prompt}
      popoverTitle="Investigate sentinel run job with workbench"
      backLabel="Sentinel run job"
      {...props}
    />
  )
}

export function SendSentinelRunToWorkbenchButton({
  run,
  ...props
}: { run: Nullable<SentinelRunFragment> } & ButtonProps) {
  const prompt = useMemo(
    () => (run ? buildSentinelRunWorkbenchPrompt(run) : ''),
    [run]
  )

  if (run?.status !== SentinelRunStatus.Failed) return null

  return (
    <SendToWorkbenchButton
      initialPrompt={prompt}
      popoverTitle="Investigate sentinel run with workbench"
      backLabel="Sentinel run"
      {...props}
    />
  )
}
