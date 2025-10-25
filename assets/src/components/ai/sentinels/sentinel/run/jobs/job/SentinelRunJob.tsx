import { EmptyState, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SentinelDetailsPageWrapper } from 'components/ai/sentinels/sentinel/Sentinel'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import {
  SentinelRunJobFragment,
  useSentinelRunJobQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH,
  AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH,
  AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID,
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
  const params = useParams()
  const jobId = params[AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID] ?? ''

  const { data, loading, error, refetch } = useSentinelRunJobQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const runJob = data?.sentinelRunJob
  const sentinel = runJob?.sentinelRun?.sentinel
  const runId = runJob?.sentinelRun?.id ?? ''
  const sentinelId = sentinel?.id ?? ''

  const ctx = useMemo(
    () => ({
      job: runJob,
      refetch,
      pathPrefix: getSentinelRunJobAbsPath({ sentinelId, runId, jobId }),
    }),
    [runJob, refetch, sentinelId, runId, jobId]
  )
  useSetBreadcrumbs(
    useMemo(
      () =>
        getSentinelRunJobBreadcrumbs({
          sentinel,
          runId,
          jobName: runJob?.reference?.name ?? '',
        }),
      [sentinel, runId, runJob?.reference?.name]
    )
  )
  return (
    <SentinelDetailsPageWrapper
      header={
        <StackedText
          loading={!runJob && loading}
          first={error ? 'Error' : (runJob?.reference?.name ?? '')}
          second={runJob?.reference?.namespace ?? ''}
        />
      }
      content={
        <Flex
          direction="column"
          gap="medium"
          minHeight="0"
          maxWidth="100%"
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
