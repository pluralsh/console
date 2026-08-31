import { ResponsiveLine } from '@nivo/line'
import { WorkbenchGraphCard } from 'components/workbenches/common/WorkbenchGraphCard'
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import { useChartTheme } from 'components/utils/charts'
import {
  EvalResultsPeriod,
  WorkbenchPrMergeRateEntry,
  useWorkbenchesEvalsMergeRateGraphQuery,
} from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { GqlError } from 'components/utils/Alert'

export function WorkbenchesEvalsMergeRateGraph() {
  const theme = useTheme()
  const chartTheme = useChartTheme()
  const [range, setRange] = useState<RangeSelectorOption>('1W')

  const { data, loading, error } = useWorkbenchesEvalsMergeRateGraphQuery({
    variables: { period: rangeToPeriod[range] },
    fetchPolicy: 'cache-and-network',
  })

  if (error) return <GqlError error={error} />

  const mergeRateEntries = (data?.workbenchPrMergeRates ?? []).filter(
    (point): point is WorkbenchPrMergeRateEntry => point != null
  )

  const mergeRateSeries = mergeRateEntries.map((point, idx) => ({
    x: point.timestamp ? compactDateLabel(point.timestamp) : `t${idx + 1}`,
    y: clamp((point.mergeRate ?? 0) * 100, 0, 100),
  }))
  const hasData = mergeRateSeries.length > 0

  return (
    <WorkbenchGraphCard
      title="PR merge rate"
      rightContent={
        <ButtonGroup
          size="small"
          directory={rangeOptions.map((option) => ({
            path: option,
            label: option,
          }))}
          tab={range}
          onClick={(key) => setRange(key as RangeSelectorOption)}
        />
      }
      hint="The ratio of PRs/MRs that get merged."
      loading={loading}
    >
      <div css={{ minHeight: 200, width: '100%' }}>
        {hasData ? (
          <ResponsiveLine
            data={[{ id: 'Merge rate', data: mergeRateSeries }]}
            animate
            theme={chartTheme}
            colors={[theme.colors['icon-info']]}
            margin={{ top: 16, right: 16, bottom: 24, left: 48 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 100, stacked: false }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: [0, 20, 40, 60, 80, 100],
              format: (v) => `${v}%`,
            }}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickRotation: 0,
            }}
            enableGridX={false}
            enableGridY
            gridYValues={[0, 20, 40, 60, 80, 100]}
            enablePoints={false}
            useMesh
            curve="linear"
            tooltip={({ point }) => (
              <ChartTooltip
                color={String(point.color)}
                label={String(point.data.x)}
                value={`${Number(point.data.y).toFixed(2)}%`}
              />
            )}
          />
        ) : (
          <div
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-xlight'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            No PR merge rate data yet.
          </div>
        )}
      </div>
    </WorkbenchGraphCard>
  )
}

function compactDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.toLocaleString('en-US', { day: '2-digit' })
  return `${month} ${day}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const rangeOptions = ['1D', '1W', '1M'] as const

type RangeSelectorOption = (typeof rangeOptions)[number]

const rangeToPeriod: Record<RangeSelectorOption, EvalResultsPeriod> = {
  '1D': EvalResultsPeriod.Day,
  '1W': EvalResultsPeriod.Week,
  '1M': EvalResultsPeriod.Month,
}
