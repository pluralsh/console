import { Code, EmptyState } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'
import { SentinelRunJobOutletCtxT } from './SentinelRunJob'

export function SentinelRunJobOutput() {
  const { job } = useOutletContext<SentinelRunJobOutletCtxT>()
  if (!job.output)
    return <EmptyState message="No output available yet for this job." />
  return <Code css={{ overflow: 'auto' }}>{job.output}</Code>
}
