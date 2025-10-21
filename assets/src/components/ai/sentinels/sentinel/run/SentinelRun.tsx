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
} from 'routes/aiRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { SentinelStatusChip } from '../../SentinelsTableCols'
import { SentinelDetailsPageWrapper } from '../Sentinel'
import { getRunNameFromId } from '../SentinelRunsTable'
import { SentinelRunSidecar } from '../SentinelSidecars'
import { SentinelRunChecksTable } from './SentinelRunChecksTable'

export type SentinelCheckWithResult = {
  check: SentinelCheckFragment
  result: Nullable<SentinelRunResultFragment>
}

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
      run?.sentinel?.checks?.filter(isNonNullable).map((check) => ({
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
      () => [
        ...getAIBreadcrumbs('sentinels'),
        {
          label: run?.sentinel?.name ?? '',
          url: getSentinelAbsPath(run?.sentinel?.id ?? ''),
        },
        { label: `run-${run?.id.slice(0, 8) ?? ''}` },
      ],
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
    <SentinelDetailsPageWrapper
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
