import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import {
  AiSparkleFilledIcon,
  Button,
  ButtonProps,
  Card,
  Chip,
  ChipSeverity,
  Flex,
  Markdown,
  SemanticColorKey,
  SubTab,
  Table,
  TabList,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { RawYaml } from 'components/component/ComponentRaw'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import {
  SentinelCheckType,
  SentinelRunJobStatus,
  SentinelRunJobTinyFragment,
  SentinelRunResultFragment,
  useSentinelRunJobsQuery,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_SENTINELS_RUNS_JOBS_REL_PATH } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { deepOmitFalsy, mapExistingNodes } from 'utils/graphql'
import { sentinelRunJobsCols } from './jobs/SentinelRunJobsCols'
import { SentinelCheckWithResult } from './SentinelRun'

export type JobStatusFilterKey =
  | 'All'
  | Exclude<SentinelRunJobStatus, SentinelRunJobStatus.Pending>

enum ExpanderTab {
  Reason = 'reason',
  CheckDefinition = 'checkDefinition',
}

export function SentinelRunChecksTableExpander({
  row,
}: {
  row: Row<SentinelCheckWithResult>
}) {
  const { spacing, partials } = useTheme()
  const { check, result, runId } = row.original
  const [tab, setTab] = useState<ExpanderTab>(
    result?.reason ? ExpanderTab.Reason : ExpanderTab.CheckDefinition
  )
  if (check.type === SentinelCheckType.IntegrationTest)
    return (
      <WrapperSC>
        <IntegrationTestExpander
          runId={runId}
          checkName={check.name}
          result={result}
        />
      </WrapperSC>
    )
  return (
    <WrapperSC>
      {result?.reason && (
        <SegmentedControlCardSC>
          <SegmentedControlBtn
            active={tab === ExpanderTab.Reason}
            onClick={() => setTab(ExpanderTab.Reason)}
          >
            <Flex gap="xsmall">
              <AiSparkleFilledIcon size={12} />
              AI Reason
            </Flex>
          </SegmentedControlBtn>
          <SegmentedControlBtn
            active={tab === ExpanderTab.CheckDefinition}
            onClick={() => setTab(ExpanderTab.CheckDefinition)}
          >
            Check Definition
          </SegmentedControlBtn>
        </SegmentedControlCardSC>
      )}
      {result?.reason && tab === ExpanderTab.Reason && (
        <Card
          css={{ padding: spacing.medium, '& *': { ...partials.text.code } }}
        >
          <Markdown text={result.reason} />
        </Card>
      )}
      {tab === ExpanderTab.CheckDefinition && (
        <RawYaml raw={deepOmitFalsy(check)} />
      )}
    </WrapperSC>
  )
}

function IntegrationTestExpander({
  runId,
  checkName,
  result,
}: {
  runId: string
  checkName: string
  result: Nullable<SentinelRunResultFragment>
}) {
  const tabStateRef = useRef<any>(null)
  const [statusFilterKey, setStatusFilterKey] =
    useState<JobStatusFilterKey>('All')

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useSentinelRunJobsQuery, keyPath: ['sentinelRun', 'jobs'] },
      {
        id: runId,
        check: checkName,
        status: statusFilterKey === 'All' ? undefined : statusFilterKey,
      }
    )
  const jobs = useMemo(
    () => mapExistingNodes(data?.sentinelRun?.jobs),
    [data?.sentinelRun?.jobs]
  )
  const statusCounts = useMemo(() => getJobStatusCounts(result), [result])

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="xsmall"
      minHeight={0}
    >
      <StretchedFlex>
        <Subtitle2H1>
          {isNullish(result?.jobCount)
            ? 'Waiting for jobs...'
            : `Jobs (${result.jobCount})`}
        </Subtitle2H1>
        <TabList
          scrollable
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: statusFilterKey,
            onSelectionChange: (key) =>
              setStatusFilterKey(key as JobStatusFilterKey),
          }}
        >
          {Object.entries(statusCounts).map(([label, count]) => (
            <SubTab
              key={label}
              className="statusTab"
              css={{ display: 'flex', gap: 12 }}
            >
              {label === SentinelRunJobStatus.Pending
                ? 'Pending'
                : capitalize(label)}
              {count !== null && (
                <Chip
                  size="small"
                  severity={jobStatusToSeverity(label as JobStatusFilterKey)}
                >
                  {count}
                </Chip>
              )}
            </SubTab>
          ))}
        </TabList>
      </StretchedFlex>
      <Table
        virtualizeRows
        fullHeightWrap
        rowBg="base"
        data={jobs}
        loading={!data && loading}
        columns={sentinelRunJobsCols}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No jobs found.' }}
        getRowLink={({ original }) => (
          <Link
            to={`${AI_SENTINELS_RUNS_JOBS_REL_PATH}/${(original as SentinelRunJobTinyFragment).id}`}
          />
        )}
      />
    </Flex>
  )
}

const WrapperSC = styled.div<{ $bgColor?: SemanticColorKey }>(
  ({ theme, $bgColor = 'fill-zero' }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: 500,
    overflow: 'auto',
    gap: theme.spacing.medium,
    padding: `${theme.spacing.medium}px ${theme.spacing.medium}px ${theme.spacing.large}px`,
    background: theme.colors[$bgColor],
    borderTop: theme.borders['fill-one'],
  })
)

// should break this out into DS if we use it again
const SegmentedControlCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.xxsmall,
  background: 'transparent',
  width: 'fit-content',
}))
function SegmentedControlBtn({
  active,
  ...props
}: { active: boolean } & ButtonProps) {
  const { spacing } = useTheme()
  return (
    <Button
      small
      css={{ padding: `0 ${spacing.xsmall}px`, minHeight: 24 }}
      style={{ ...(active && { pointerEvents: 'none', cursor: 'default' }) }}
      floating={active}
      tertiary={!active}
      {...props}
    />
  )
}

export const getJobStatusCounts = (
  result: Nullable<SentinelRunResultFragment>
): Record<JobStatusFilterKey, number | null> => {
  const jobCount = result?.jobCount ?? 0
  const successfulCount = result?.successfulCount ?? 0
  const failedCount = result?.failedCount ?? 0
  return {
    All: jobCount,
    [SentinelRunJobStatus.Success]: successfulCount,
    [SentinelRunJobStatus.Failed]: failedCount,
    [SentinelRunJobStatus.Running]: jobCount - successfulCount - failedCount,
  }
}

export const jobStatusToSeverity = (
  status: JobStatusFilterKey
): ChipSeverity => {
  switch (status) {
    case SentinelRunJobStatus.Failed:
      return 'danger'
    case SentinelRunJobStatus.Success:
      return 'success'
    case SentinelRunJobStatus.Running:
      return 'info'
    default:
      return 'neutral'
  }
}
