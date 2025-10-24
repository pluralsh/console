import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import {
  Card,
  Flex,
  Markdown,
  SemanticColorKey,
  Table,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { RawYaml } from 'components/component/ComponentRaw'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import {
  SentinelCheckType,
  SentinelRunResultFragment,
  useSentinelRunJobsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { deepOmitFalsy, mapExistingNodes } from 'utils/graphql'
import { sentinelRunJobsCols } from './jobs/SentinelRunJobsCols'
import { SentinelCheckWithResult } from './SentinelRun'

export function SentinelRunChecksTableExpander({
  row,
}: {
  row: Row<SentinelCheckWithResult>
}) {
  const { spacing } = useTheme()
  const { check, result, runId } = row.original
  if (check.type === SentinelCheckType.IntegrationTest)
    return (
      <WrapperSC $bgColor="fill-two">
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
        <Card
          fillLevel={1}
          header={{
            content: 'reason',
            outerProps: { style: { minHeight: 'fit-content' } },
          }}
          css={{ padding: spacing.medium }}
        >
          <Markdown text={result.reason} />
        </Card>
      )}
      <Card
        fillLevel={1}
        header={{
          content: 'check definition',
          outerProps: { style: { minHeight: 'fit-content' } },
        }}
      >
        <RawYaml
          showHeader={false}
          css={{ border: 'none', background: 'transparent' }}
          raw={deepOmitFalsy(check)}
        />
      </Card>
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
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useSentinelRunJobsQuery, keyPath: ['sentinelRun', 'jobs'] },
      { id: runId, check: checkName }
    )
  const jobs = useMemo(
    () => mapExistingNodes(data?.sentinelRun?.jobs),
    [data?.sentinelRun?.jobs]
  )

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
      </StretchedFlex>
      <Table
        fullHeightWrap
        rowBg="base"
        data={jobs}
        loading={!data && loading}
        columns={sentinelRunJobsCols}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
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
    gap: theme.spacing.large,
    padding: `${theme.spacing.large}px ${theme.spacing.medium}px`,
    background: theme.colors[$bgColor],
    borderTop: theme.borders['fill-one'],
  })
)
