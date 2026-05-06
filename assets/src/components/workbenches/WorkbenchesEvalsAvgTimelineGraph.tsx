import { ResponsiveLine } from '@nivo/line'
import { SemanticColorKey } from '@pluralsh/design-system'
import { WorkbenchGraphCard } from 'components/workbenches/common/WorkbenchGraphCard'
import { GqlError } from 'components/utils/Alert'
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { useChartTheme } from 'components/utils/charts'
import { TRUNCATE } from 'components/utils/truncate'
import {
  EvalResultsPeriod,
  WorkbenchEvalResultsWorkbenchAverage,
  useWorkbenchesEvalsAvgTimelineGraphQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'

const MAX_GRADE = 10
const MAX_WORKBENCH_SERIES = 6

export function WorkbenchesEvalsAvgTimelineGraph() {
  const theme = useTheme()
  const chartTheme = useChartTheme()
  const [range, setRange] = useState<RangeSelectorOption>('1W')
  const { data, loading, error } = useWorkbenchesEvalsAvgTimelineGraphQuery({
    variables: { period: rangeToPeriod[range] },
    fetchPolicy: 'cache-and-network',
  })

  if (error) return <GqlError error={error} />

  const series = useMemo(
    () => buildSeries(data?.averageWorkbenchEvalResults ?? [], theme),
    [data?.averageWorkbenchEvalResults, theme]
  )

  const visibleSeries = series.slice(0, MAX_WORKBENCH_SERIES)

  return (
    <WorkbenchGraphCard
      title="Average workbench grades"
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
      hint="Shows the average workbench grades over time."
      loading={loading}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          height: '100%',
        }}
      >
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: theme.spacing.small,
          }}
        >
          {visibleSeries.map((item) => (
            <div
              key={item.id}
              css={{
                border: theme.borders.default,
                borderRadius: theme.borderRadiuses.medium,
                padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xsmall,
              }}
            >
              <span
                css={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <div
                css={{
                  ...theme.partials.text.body2,
                  color: theme.colors['text-light'],
                  ...TRUNCATE,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div css={{ minHeight: 280, width: '100%', flex: 1 }}>
          <ResponsiveLine
            data={visibleSeries.map((item) => ({
              id: item.label,
              data: item.data,
            }))}
            theme={chartTheme}
            colors={visibleSeries.map((item) => item.color)}
            margin={{ top: 8, right: 16, bottom: 32, left: 48 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: MAX_GRADE, stacked: false }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
            enablePoints={false}
            enableGridX={false}
            enableGridY
            useMesh
            curve="linear"
          />
        </div>
      </div>
    </WorkbenchGraphCard>
  )
}

function buildSeries(
  entries: Array<WorkbenchEvalResultsWorkbenchAverage | null>,
  theme: DefaultTheme
) {
  const grouped = new Map<
    string,
    { id: string; label: string; raw: Array<{ timestamp: string; y: number }> }
  >()

  for (const entry of entries) {
    const wb = entry?.workbench
    const timestamp = entry?.timestamp
    if (!wb || !timestamp) continue
    const y = clamp(entry.average ?? 0, 0, MAX_GRADE)

    const current = grouped.get(wb.id) ?? { id: wb.id, label: wb.name, raw: [] }
    current.raw.push({ timestamp, y })
    grouped.set(wb.id, current)
  }

  return [...grouped.values()]
    .map((item, idx) => {
      const sorted = item.raw.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      const colorToken = seriesColorToken(idx)

      return {
        id: item.id,
        label: item.label,
        color: theme.colors[colorToken],
        latest: sorted.length ? (sorted[sorted.length - 1]?.y ?? 0) : 0,
        data: sorted.map((point, pointIdx) => ({
          x: compactDateLabel(point.timestamp) || `t${pointIdx + 1}`,
          y: point.y,
        })),
      }
    })
    .sort((a, b) => b.latest - a.latest)
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

function seriesColorToken(index: number): SemanticColorKey {
  return SERIES_COLOR_TOKENS[index % SERIES_COLOR_TOKENS.length]
}

const SERIES_COLOR_TOKENS: SemanticColorKey[] = [
  'icon-success',
  'icon-info',
  'border-selected',
  'icon-danger',
  'border-primary',
  'border-warning',
]
