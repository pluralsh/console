import { PieChart, PieChartData } from 'components/utils/PieChart'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import styled, { useTheme } from 'styled-components'

import { Card } from '@pluralsh/design-system'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'
import { GqlError } from 'components/utils/Alert'

import { PropWideBold } from 'components/component/info/common'

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
    clusterPolicyStatsError,
    enforcementStatsError,
  } = usePolicyChartsData(filters)

  if (clusterPolicyStatsError || enforcementStatsError) {
    return <GqlError error={clusterPolicyStatsError || enforcementStatsError} />
  }

  return (
    <div css={{ display: 'flex', overflow: 'auto', gap: theme.spacing.large }}>
      <PolicyChartCard
        title="Clusters with Violations"
        data={clusterPolicyChartData}
      />
      <PolicyChartCard
        title="Constraints by Enforcement"
        data={enforcementChartData}
      />
    </div>
  )
}

function PolicyChartCard({
  title,
  data,
}: {
  title: string
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
          <ChartSkeleton scale={0.4} />
        ) : (
          <>
            <PieChart
              width={CHART_SIZE}
              height={CHART_SIZE}
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
  return (
    <div css={{ flex: 1 }}>
      {data.map((datum) => (
        <div key={datum.id}>
          <PropWideBold title={datum.label ?? ''}>
            <span css={{ color: datum.color }}>{datum.value}</span>
          </PropWideBold>
        </div>
      ))}
    </div>
  )
}
