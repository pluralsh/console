import { EmptyState, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchJobQuery } from 'generated/graphql'
import { truncate } from 'lodash'
import { Suspense, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchJobAbsPath,
  WORKBENCH_JOBS_PARAM_JOB,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchJobActivities } from './WorkbenchJobActivities'
import { WorkbenchJobResult } from './WorkbenchJobResult'
import { WorkbenchJobTodos } from './WorkbenchJobTodos'
import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'
import { WorkbenchJobTriggerAlert } from './WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerIssue } from './WorkbenchJobTriggerIssue'
import { WorkbenchJobPrs } from './WorkbenchJobPrs'
import { isNonNullable } from 'utils/isNonNullable'

export function WorkbenchJob() {
  const { [WORKBENCH_JOBS_PARAM_JOB]: jobId = '' } = useParams()

  const {
    data,
    loading,
    error: queryError,
  } = useWorkbenchJobQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const job = data?.workbenchJob
  const isLoading = loading && !job

  const [workbenchId, workbenchName, prompt] = [
    job?.workbench?.id ?? '',
    job?.workbench?.name ?? 'workbench',
    job?.prompt ?? 'workbench job',
  ]
  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
        { label: workbenchName, url: getWorkbenchAbsPath(workbenchId) },
        {
          label: truncate(prompt ?? '', { length: 50 }),
          url: getWorkbenchJobAbsPath({ workbenchId, jobId }),
        },
      ],
      [prompt, jobId, workbenchId, workbenchName]
    )
  )

  if (!(job || loading))
    return !jobId ||
      queryError?.message?.includes('could not find resource') ? (
      <EmptyState message="Workbench job not found." />
    ) : (
      <GqlError
        header="Failed to load workbench job"
        margin="large"
        error={queryError}
      />
    )

  return (
    <>
      {job?.error && (
        <GqlError
          header="Workbench job reported an error"
          error={job?.error}
          margin="large"
          css={{ marginBottom: 0 }}
        />
      )}
      <WrapperSC>
        <Flex
          direction="column"
          gap="large"
          minWidth={560}
          flex={7}
        >
          <StretchedFlex gap="xlarge">
            <StackedText
              truncate
              loading={isLoading}
              first={job?.workbench?.name}
              firstColor="text"
              firstPartialType="subtitle2"
              second={job?.prompt}
              secondColor="text-xlight"
              secondPartialType="body2"
            />
            <RunStatusChip
              loading={isLoading}
              status={job?.status}
            />
          </StretchedFlex>
          <PluralErrorBoundary shouldLog={false}>
            <Suspense
              fallback={
                <RectangleSkeleton
                  $width="100%"
                  $height="100%"
                />
              }
            >
              <WorkbenchJobActivities jobId={jobId} />
            </Suspense>
          </PluralErrorBoundary>
        </Flex>
        <Flex
          direction="column"
          gap="medium"
          minWidth={500}
          flex={!!job?.result?.conclusion ? 8 : 3}
          height="100%"
        >
          <WorkbenchJobPrs
            prs={job?.pullRequests?.filter(isNonNullable) ?? []}
          />
          <WorkbenchJobTriggerAlert alert={job?.alert} />
          <WorkbenchJobTriggerIssue issue={job?.issue} />
          <WorkbenchJobResult
            loading={isLoading}
            result={job?.result}
          />
          <WorkbenchJobTodos
            loading={isLoading}
            result={job?.result}
          />
        </Flex>
      </WrapperSC>
    </>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
  overflow: 'auto',
  maxWidth: theme.breakpoints.desktopLarge,
  padding: theme.spacing.large,
}))
