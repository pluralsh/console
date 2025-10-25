import { K8sRunJob } from 'components/utils/run-job/RunJob'
import { useStackRunJobQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getStackRunsAbsPath } from 'routes/stacksRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'

export function StackRunJob() {
  const { stackId, runId } = useParams()

  const { data, loading, error, refetch } = useStackRunJobQuery({
    variables: { id: runId || '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5_000,
  })

  const pods = useMemo(
    () => data?.stackRun?.job?.pods?.filter(isNonNullable) ?? [],
    [data?.stackRun?.job?.pods]
  )

  return (
    <K8sRunJob
      job={data?.stackRun?.job}
      pods={pods}
      loading={loading}
      error={error}
      refetch={refetch}
      pathPrefix={`${getStackRunsAbsPath(stackId, runId)}/job`}
    />
  )
}
