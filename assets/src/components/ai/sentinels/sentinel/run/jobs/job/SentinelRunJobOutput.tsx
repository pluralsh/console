import { useOutletContext } from 'react-router-dom'
import { SentinelRunJobOutletCtxT } from './SentinelRunJob'
import { Code, EmptyState } from '@pluralsh/design-system'

export function SentinelRunJobOutput() {
  const { job } = useOutletContext<SentinelRunJobOutletCtxT>()
  if (!job.output)
    return <EmptyState message="No output available yet for this job." />
  return <Code language="auto">{job.output}</Code>
}
