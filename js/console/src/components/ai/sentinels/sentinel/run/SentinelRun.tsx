import {
  IconFrame,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { getAIBreadcrumbs } from 'components/ai/AI'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import {
  SentinelCheckFragment,
  SentinelFragment,
  SentinelRunResultFragment,
  SentinelRunStatus,
  useSentinelRunQuery,
} from 'generated/graphql'
import { groupBy } from 'lodash'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AI_SENTINELS_RUNS_PARAM_RUN_ID,
  getSentinelAbsPath,
  getSentinelRunAbsPath,
} from 'routes/aiRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { SentinelStatusChip } from '../../SentinelsTableCols'
import { DetailsPageWithSidecarWrapper } from '../Sentinel'
import { getRunNameFromId } from '../SentinelRunsTables'
import { SentinelRunSidecar } from '../SentinelSidecars'
import { SentinelRunChecksTable } from './SentinelRunChecksTable'

export type SentinelCheckWithResult = {
  runId: string
  check: SentinelCheckFragment
  result: Nullable<SentinelRunResultFragment>
}

export const getSentinelRunBreadcrumbs = ({
  sentinel,
  runId,
}: {
  sentinel: Nullable<Pick<SentinelFragment, 'id' | 'name'>>
  runId: Nullable<string>
}) => [
  ...getAIBreadcrumbs('sentinels'),
  { label: sentinel?.name ?? '', url: getSentinelAbsPath(sentinel?.id ?? '') },
  {
    label: `run-${runId?.slice(0, 8) ?? ''}`,
    url: getSentinelRunAbsPath({
      sentinelId: sentinel?.id ?? '',
      runId: runId ?? '',
    }),
  },
]

export function SentinelRun() {
  const id = useParams()[AI_SENTINELS_RUNS_PARAM_RUN_ID]

  const { data, error, loading } = useSentinelRunQuery({
    variables: { id: id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !id,
  })
  const sentinelRunLoading = !data && loading
  const run = data?.sentinelRun

  const tableData: SentinelCheckWithResult[] = useMemo(() => {
    const groupedResults = groupBy(run?.results, 'name')
    return (
      run?.checks?.filter(isNonNullable).map((check) => ({
        runId: run.id,
        check,
        result: groupedResults[check.name]?.[0],
      })) ?? []
    )
  }, [run])

  const numErrors =
    run?.results?.filter(
      (result) => result?.status === SentinelRunStatus.Failed
    )?.length ?? 0

  useSetBreadcrumbs(
    useMemo(
      () =>
        getSentinelRunBreadcrumbs({ sentinel: run?.sentinel, runId: run?.id }),
      [run]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <DetailsPageWithSidecarWrapper
      header={
        <>
          <StackedText
            loading={sentinelRunLoading}
            first={getRunNameFromId(run?.id ?? '')}
            firstPartialType="subtitle1"
            firstColor="text"
            second={run?.sentinel?.description}
            secondPartialType="body2"
            secondColor="text-xlight"
            icon={
              <IconFrame
                clickable
                as={Link}
                to={getSentinelAbsPath(run?.sentinel?.id ?? '')}
                type="secondary"
                icon={<ReturnIcon />}
                size="large"
                tooltip={`View ${run?.sentinel?.name} details`}
              />
            }
          />
          {run?.status && (
            <SentinelStatusChip
              filled
              showIcon
              showSeverity
              status={run.status}
              numErrors={numErrors}
            />
          )}
        </>
      }
      content={
        <SentinelRunChecksTable
          tableData={tableData}
          loading={sentinelRunLoading}
        />
      }
      sidecar={<SentinelRunSidecar run={run} />}
    />
  )
}
