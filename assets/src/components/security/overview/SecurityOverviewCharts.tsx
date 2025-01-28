import styled, { useTheme } from 'styled-components'

import { Card, Flex, InfoOutlineIcon, Tooltip } from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { RadialBar } from '@nivo/radial-bar'
import { CustomLegend } from 'components/home/CustomLegend'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import {
  CHART_COLOR_MAP,
  createCenteredMetric,
} from 'components/utils/RadialBarChart'
import {
  SecurityChartData,
  SecurityChartDatum,
  useSecurityOverviewChartsData,
} from './useSecurityOverviewChartsData'

type PolicyQueryFilters = {
  clusters?: (string | null)[] | undefined
  namespaces?: (string | null)[] | undefined
  kinds?: (string | null)[] | undefined
  q?: string | undefined
}

const CHART_SIZE = 240

export function SecurityOverviewPieCharts({
  filters,
}: {
  filters?: PolicyQueryFilters
}) {
  const theme = useTheme()
  const {
    clusterPolicyChartData,
    enforcementChartData,
    vulnChartData,
    clusterPolicyStatsError,
    enforcementStatsError,
    vulnStatsError,
  } = useSecurityOverviewChartsData(filters)

  if (clusterPolicyStatsError || enforcementStatsError || vulnStatsError) {
    return (
      <GqlError
        error={
          clusterPolicyStatsError || enforcementStatsError || vulnStatsError
        }
      />
    )
  }

  return (
    <div css={{ display: 'flex', overflow: 'auto', gap: theme.spacing.large }}>
      <SecurityPieChartCard
        title="cluster violations"
        data={clusterPolicyChartData}
      />
      <SecurityPieChartCard
        title="constraints by enforcement"
        data={enforcementChartData}
      />
      <SecurityPieChartCard
        title="cluster security grades"
        data={vulnChartData}
      />
    </div>
  )
}

function SecurityPieChartCard({
  title,
  data,
}: {
  title: string
  data: SecurityChartData
}) {
  const theme = useTheme()

  const CenterLabel = createCenteredMetric(
    `${data[0]?.data ? getCompliancePercent(data[0].data) : '-'}%`,
    'Compliance'
  )

  return (
    <Card
      header={{
        content: (
          <Flex
            width="100%"
            justify="space-between"
            align="center"
          >
            <span>{title}</span>
            <Tooltip
              placement="left"
              label={<ChartLegend data={data} />}
            >
              <InfoOutlineIcon />
            </Tooltip>
          </Flex>
        ),
      }}
      css={{ padding: theme.spacing.large, flex: 1, minWidth: 'fit-content' }}
    >
      <ChartWrapper>
        {data ? (
          <RadialBar
            colors={(item) => item.data.color}
            endAngle={-360}
            cornerRadius={4}
            padAngle={1.5}
            padding={0}
            innerRadius={0.6}
            tooltip={(props) => (
              <ChartTooltip
                color={props.bar.color}
                value={props.bar.formattedValue}
                label={props.bar.category}
              />
            )}
            layers={['bars', CenterLabel]}
            data={data}
            height={CHART_SIZE}
            width={CHART_SIZE}
          />
        ) : (
          <ChartSkeleton scale={0.87} />
        )}
      </ChartWrapper>
    </Card>
  )
}

function getCompliancePercent(data: SecurityChartDatum[]): number {
  const total = data.reduce((sum, d) => sum + d.y, 0)
  if (!total) return 0

  const compliant = data.find((d) => d.color === CHART_COLOR_MAP.green)?.y || 0
  return Math.round((compliant / total) * 100)
}

const ChartWrapper = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.medium,
}))

function ChartLegend({ data }: { data: SecurityChartData }) {
  return <CustomLegend data={data} />
}
