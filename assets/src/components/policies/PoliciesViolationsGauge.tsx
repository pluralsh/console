import { PieChart, PieChartData } from 'components/utils/PieChart'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import styled, { useTheme } from 'styled-components'

import { Card } from '@pluralsh/design-system'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'
import { GqlError } from 'components/utils/Alert'

import { usePolicyChartsData } from './usePolicyChartsData'

type PolicyQueryFilters = {
  clusters?: (string | null)[] | undefined
  namespaces?: (string | null)[] | undefined
  kinds?: (string | null)[] | undefined
  q?: string | undefined
}

const CHART_SIZE = '120px'

export function PoliciesViolationsGauge({
  filters,
}: {
  filters: PolicyQueryFilters
}) {
  const theme = useTheme()
  const {
    clusterPolicyChartData,
    enforcementChartData,
    installedChartData,
    clusterPolicyStatsError,
    enforcementStatsError,
    installedStatsError,
  } = usePolicyChartsData(filters)

  if (clusterPolicyStatsError || enforcementStatsError || installedStatsError) {
    return (
      <GqlError
        error={
          clusterPolicyStatsError ||
          enforcementStatsError ||
          installedStatsError
        }
      />
    )
  }

  return (
    <div css={{ display: 'flex', gap: theme.spacing.large }}>
      <PolicyChartCard
        title="Clusters with Violations"
        data={clusterPolicyChartData}
      />
      <PolicyChartCard
        title="Constraints by Enforcement"
        data={enforcementChartData}
      />
      <PolicyChartCard
        title="Installed Clusters"
        data={installedChartData}
      />
    </div>
  )
}

function PolicyChartCard({
  title,
  rotate = 45,
  data,
}: {
  title: string
  rotate?: number
  data: PieChartData | null
}) {
  const theme = useTheme()

  return (
    <Card
      css={{ padding: theme.spacing.large, flex: 1, minWidth: 'fit-content' }}
    >
      <Subtitle2H1>{title}</Subtitle2H1>
      <ChartWrapper>
        {!data ? (
          <ChartSkeleton scale={0.5} />
        ) : (
          <>
            <PieChart
              width={CHART_SIZE}
              height={CHART_SIZE}
              padAngle={3}
              startAngle={rotate}
              endAngle={360 + rotate}
              data={data}
            />
            <ChartLegend data={data} />
          </>
        )}
      </ChartWrapper>
    </Card>
  )
}

const ChartWrapper = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
}))

function ChartLegend({ data }: { data: PieChartData }) {
  const theme = useTheme()

  return (
    <div>
      {data.map((datum) => (
        <div
          key={datum.id}
          css={{
            ...theme.partials.text.body1,
          }}
        >
          <span css={{ color: datum.color }}>{datum.value}</span> {datum.label}
        </div>
      ))}
    </div>
  )
}
