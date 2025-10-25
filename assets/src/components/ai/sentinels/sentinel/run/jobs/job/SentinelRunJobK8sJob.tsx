import { K8sRunJob } from 'components/utils/run-job/RunJob'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'
import { SentinelRunJobOutletCtxT } from './SentinelRunJob'

export function SentinelRunJobK8sJob() {
  const { job, refetch, pathPrefix } =
    useOutletContext<SentinelRunJobOutletCtxT>()
  const pods = useMemo(
    () => job?.job?.pods?.filter(isNonNullable) ?? [],
    [job?.job?.pods]
  )

  return (
    <K8sRunJob
      job={job.job}
      pods={pods}
      refetch={refetch}
      pathPrefix={pathPrefix}
    />
  )
}
