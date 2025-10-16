import {
  IconFrame,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { getAIBreadcrumbs } from 'components/ai/AI'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { SentinelRunStatus, useSentinelRunQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AI_SENTINELS_RUNS_PARAM_RUN_ID,
  getSentinelAbsPath,
} from 'routes/aiRoutesConsts'
import { SentinelStatusChip } from '../../SentinelsTableCols'
import { SentinelDetailsPageWrapper } from '../Sentinel'
import { getRunNameFromId } from '../SentinelRunsTable'
import { SentinelRunSidecar } from '../SentinelSidecars'
import { SentinelRunChecksTable } from './SentinelRunChecksTable'

export function SentinelRun() {
  const id = useParams()[AI_SENTINELS_RUNS_PARAM_RUN_ID]

  const { data, error, loading } = useSentinelRunQuery({
    variables: { id: id ?? '' },
    skip: !id,
  })
  const sentinelRunLoading = !data && loading
  const sentinelRun = data?.sentinelRun
  const parentSentinel = sentinelRun?.sentinel

  const numErrors =
    sentinelRun?.results?.filter(
      (result) => result?.status === SentinelRunStatus.Failed
    )?.length ?? 0

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getAIBreadcrumbs('sentinels'),
        {
          label: parentSentinel?.name ?? '',
          url: getSentinelAbsPath(parentSentinel?.id ?? ''),
        },
        { label: `run-${sentinelRun?.id.slice(0, 8) ?? ''}` },
      ],
      [parentSentinel?.id, parentSentinel?.name, sentinelRun?.id]
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
            first={getRunNameFromId(sentinelRun?.id ?? '')}
            firstPartialType="subtitle1"
            firstColor="text"
            second={parentSentinel?.description}
            secondPartialType="body2"
            secondColor="text-xlight"
            icon={
              <IconFrame
                clickable
                as={Link}
                to={getSentinelAbsPath(parentSentinel?.id ?? '')}
                type="secondary"
                icon={<ReturnIcon />}
                size="large"
                tooltip={`View ${parentSentinel?.name} details`}
              />
            }
          />
          {sentinelRun?.status && (
            <SentinelStatusChip
              filled
              showIcon
              showSeverity
              status={sentinelRun.status}
              numErrors={numErrors}
            />
          )}
        </>
      }
      content={sentinelRun && <SentinelRunChecksTable run={sentinelRun} />}
      sidecar={<SentinelRunSidecar run={sentinelRun} />}
    />
  )
}
