import { RadialBar } from '@nivo/radial-bar'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import {
  CHART_COLOR_MAP,
  createCenteredMetric,
} from 'components/utils/RadialBarChart'
import { PolicyStatisticsQuery } from 'generated/graphql'

import { useMemo } from 'react'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { CustomLegend } from '../CustomLegend'
import { HomeCard } from '../HomeCard.tsx'
import { WarningShieldIcon } from '@pluralsh/design-system'
import { POLICIES_ABS_PATH } from '../../../routes/securityRoutesConsts.tsx'

const CHART_SIZE = 240

export function ConstraintViolationsChart({
  data,
}: {
  data: PolicyStatisticsQuery | undefined
}) {
  const { chartData } = useChartData(data || {})

  const CenterLabel = createCenteredMetric(
    `${data ? getPercentCompliance(data) : '-'}%`,
    `Compliance`
  )

  return (
    <HomeCard
      icon={<WarningShieldIcon />}
      title="Policy overview"
      tooltip={<CustomLegend data={chartData} />}
      link={POLICIES_ABS_PATH}
    >
      {data?.policyStatistics ? (
        <RadialBar
          colors={(item) => item.data.color}
          endAngle={360}
          cornerRadius={5}
          padAngle={2}
          padding={0.5}
          innerRadius={0.4}
          tooltip={(props) => (
            <ChartTooltip
              color={props.bar.color}
              value={props.bar.formattedValue}
              label={props.bar.category}
            />
          )}
          layers={['bars', CenterLabel]}
          data={chartData}
          height={CHART_SIZE}
          width={CHART_SIZE}
        />
      ) : (
        <ChartSkeleton scale={0.87} />
      )}
    </HomeCard>
  )
}

const useChartData = (data: PolicyStatisticsQuery) => {
  const numWithViolations =
    data?.policyStatistics?.find((stat) => stat?.aggregate === 'exists')
      ?.count ?? 0
  const numWithoutViolations =
    data?.policyStatistics?.find((stat) => stat?.aggregate === 'none')?.count ??
    0

  return useMemo(() => {
    const chartData = [
      {
        id: 'compliance',
        data: [
          {
            color: CHART_COLOR_MAP.red,
            x: 'With violations',
            y: numWithViolations,
          },
          {
            color: CHART_COLOR_MAP.green,
            x: 'Without violations',
            y: numWithoutViolations || 0,
          },
        ],
      },
    ]

    return { chartData }
  }, [numWithViolations, numWithoutViolations])
}

const getPercentCompliance = (data: PolicyStatisticsQuery) => {
  if (!data?.policyStatistics) return 0

  const total = data.policyStatistics.reduce(
    (sum, val) => sum + (val?.count || 0),
    0
  )
  const numCompliant =
    data.policyStatistics.find((stat) => stat?.aggregate === 'none')?.count || 0

  return Math.round((numCompliant / total) * 100)
}
