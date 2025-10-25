import { EmptyState, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SentinelDetailsPageWrapper } from 'components/ai/sentinels/sentinel/Sentinel'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import {
  SentinelRunJobFragment,
  useSentinelRunIdAndNameQuery,
  useSentinelRunJobQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH,
  AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH,
  AI_SENTINELS_RUNS_PARAM_RUN_ID,
  getSentinelRunJobAbsPath,
} from 'routes/aiRoutesConsts'
import { getSentinelRunBreadcrumbs } from '../../SentinelRun'

export type SentinelRunJobOutletCtxT = {
  job: SentinelRunJobFragment
  refetch: () => void
  pathPrefix: string
}

const directory: SubtabDirectory = [
  { path: AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH, label: 'Output' },
  { path: AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH, label: 'Job' },
]

const getSentinelRunJobBreadcrumbs = ({
  sentinel,
  runId,
  jobName,
}: { jobName: Nullable<string> } & Parameters<
  typeof getSentinelRunBreadcrumbs
>[0]) => [
  ...getSentinelRunBreadcrumbs({ sentinel, runId }),
  { label: jobName ?? '', url: '' },
]

export function SentinelRunJob() {
  const runId = useParams()[AI_SENTINELS_RUNS_PARAM_RUN_ID] ?? ''

  const { data, loading, error, refetch } = useSentinelRunJobQuery({
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const runJob = data?.sentinelRunJob
  const k8sJob = runJob?.job

  const { data: runNameData } = useSentinelRunIdAndNameQuery({
    variables: { id: runId },
  })
  const { sentinel } = runNameData?.sentinelRun ?? {}
  const ctx = useMemo(
    () => ({
      job: runJob,
      refetch,
      pathPrefix: getSentinelRunJobAbsPath({
        sentinelId: sentinel?.id ?? '',
        runId,
        jobId: runJob?.id ?? '',
      }),
    }),
    [runJob, refetch, runId, sentinel?.id]
  )
  useSetBreadcrumbs(
    useMemo(
      () =>
        getSentinelRunJobBreadcrumbs({
          sentinel,
          runId,
          jobName: k8sJob?.metadata?.name ?? '',
        }),
      [sentinel, runId, k8sJob?.metadata?.name]
    )
  )
  return (
    <SentinelDetailsPageWrapper
      header={
        <StackedText
          loading={!runJob?.job && loading}
          first={error ? 'Error' : (k8sJob?.metadata?.name ?? '')}
          second={k8sJob?.metadata?.namespace ?? ''}
        />
      }
      content={
        <Flex
          direction="column"
          gap="medium"
        >
          <SubTabs directory={directory} />
          {runJob ? (
            <Outlet context={ctx} />
          ) : error ? (
            <GqlError error={error} />
          ) : loading ? (
            <LoadingIndicator />
          ) : (
            <EmptyState message="Job not found." />
          )}
        </Flex>
      }
    />
  )
}
