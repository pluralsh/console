import { WorkbenchStatCard } from 'components/workbenches/common/WorkbenchStatCard'
import { WorkbenchesEvalsAvgGraph } from 'components/workbenches/WorkbenchesEvalsAvgGraph'
import { WorkbenchesEvalsMergeRateGraph } from 'components/workbenches/WorkbenchesEvalsMergeRateGraph'
import { GqlError } from 'components/utils/Alert'
import { useWorkbenchDashboardQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Flex } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export function WorkbenchesEvals() {
  const theme = useTheme()

  const { data, loading, error } = useWorkbenchDashboardQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  })

  const { totalPrsMerged, overallWorkbenchAvg, mergeRateAvg } = useMemo(() => {
    return {
      totalPrsMerged: data?.workbenchPullRequests ?? 0,
      overallWorkbenchAvg: data?.workbenchAggregates?.evalResults ?? 0,
      mergeRateAvg: clamp(
        (data?.workbenchAggregates?.pullRequestMergeRate ?? 0) * 100,
        0,
        100
      ),
    }
  }, [data])

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <div
        css={{
          display: 'grid',
          gap: theme.spacing.medium,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        }}
      >
        <WorkbenchStatCard
          label="PRs merged"
          value={totalPrsMerged.toString()}
          helper="Over lifetime"
          loading={loading}
        />
        <WorkbenchStatCard
          label="PR merge rate"
          value={`${mergeRateAvg.toFixed(1)}%`}
          helper="Average merged ratio"
          loading={loading}
        />
        <WorkbenchStatCard
          label="Avg grade"
          value={`${overallWorkbenchAvg.toFixed(1)}`}
          helper="Average score across workbenches"
          loading={loading}
        />
      </div>
      <div
        css={{
          display: 'grid',
          gap: theme.spacing.medium,
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          [`@container (max-width: 1200px)`]: { gridTemplateColumns: '1fr' },
        }}
      >
        <WorkbenchesEvalsMergeRateGraph />
        <WorkbenchesEvalsAvgGraph />
      </div>
    </Flex>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
