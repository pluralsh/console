import { POLL_INTERVAL } from 'components/cluster/constants'
import { GqlError } from 'components/utils/Alert'
import { K8sRunJob } from 'components/utils/run-job/RunJob'
import { useSentinelRunJobK8sJobQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'
import { SentinelRunJobOutletCtxT } from './SentinelRunJob'

export function SentinelRunJobK8sJob() {
  const { job, pathPrefix } = useOutletContext<SentinelRunJobOutletCtxT>()

  const { data, loading, error, refetch } = useSentinelRunJobK8sJobQuery({
    variables: { id: job?.id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const pods = useMemo(
    () => data?.sentinelRunJob?.job?.pods?.filter(isNonNullable) ?? [],
    [data?.sentinelRunJob?.job?.pods]
  )

  if (error) return <GqlError error={error} />

  return (
    <K8sRunJob
      job={data?.sentinelRunJob?.job}
      pods={pods}
      loading={loading}
      refetch={refetch}
      pathPrefix={pathPrefix}
      clusterId={data?.sentinelRunJob?.cluster?.id ?? ''}
    />
  )
}
