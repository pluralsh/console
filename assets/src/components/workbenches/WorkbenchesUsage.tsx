import { ResponsiveLine } from '@nivo/line'
import { Card, Flex, ProgressBar } from '@pluralsh/design-system'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { useChartTheme } from 'components/utils/charts'
import { CaptionP } from 'components/utils/typography/Text'
import { GqlError } from 'components/utils/Alert'
import { WorkbenchGraphCard } from './common/WorkbenchGraphCard'
import { WorkbenchStatCard } from './common/WorkbenchStatCard'
import {
  compactDateLabel,
  formatTokenCost,
  formatTokenCount,
  USAGE_RANGE_OPTIONS,
  UsageRangeOption,
} from './common/workbenchUsage'
import { EvalResultsPeriod, useWorkbenchesUsageQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'

type UsageEntry = {
  timestamp?: Nullable<string>
  inputTokens?: Nullable<number>
  outputTokens?: Nullable<number>
  totalCost?: Nullable<number>
  workbench?: Nullable<{ id: string; name: string }>
}

type UsageTotals = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  totalCost: number
  hasCost: boolean
}

export function WorkbenchesUsage() {
  const theme = useTheme()
  const layout = getUsageLayout(theme)
  const [range, setRange] = useState<UsageRangeOption>('1D')
  const { data, loading, error } = useWorkbenchesUsageQuery({
    variables: { period: rangeToPeriod[range] },
    fetchPolicy: 'cache-and-network',
  })

  const entries = useMemo(
    () =>
      (data?.workbenchUsage ?? []).filter(
        (entry): entry is UsageEntry => entry != null
      ),
    [data?.workbenchUsage]
  )
  const totals = useMemo(() => deriveTotals(entries), [entries])

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      overflowY="auto"
    >
      <div
        css={{
          display: 'grid',
          gap: theme.spacing.large,
          gridTemplateColumns: `repeat(auto-fit, minmax(${layout.statCardMinWidth}px, 1fr))`,
        }}
      >
        <WorkbenchStatCard
          label="Total tokens"
          value={formatTokenCount(totals.totalTokens) ?? '0'}
          helper="Across all workbenches, over selected range"
          loading={loading}
        />
        <WorkbenchStatCard
          label="Total cost"
          value={
            totals.hasCost
              ? formatTokenCost(totals.totalCost)!
              : 'Not available'
          }
          helper={
            totals.hasCost
              ? 'Estimated from token counts'
              : 'Cost cannot be estimated for this range'
          }
          loading={loading}
        />
      </div>
      <WorkbenchGraphCard
        title="Token & cost usage"
        hint="Aggregated across all workbenches. Cost is estimated from token counts."
        rightContent={
          <RangeButtonGroup
            range={range}
            setRange={setRange}
          />
        }
        loading={loading}
        minContentHeight={layout.graphMinHeight}
      >
        <div
          css={{
            display: 'grid',
            gap: theme.spacing.large,
            gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
          }}
        >
          <UsageLineChart
            title="Input token"
            value={formatTokenCount(totals.inputTokens) ?? '0'}
            entries={entries}
            getValue={(entry) => entry.inputTokens ?? 0}
            color={theme.colors['graph-blue']}
            formatValue={(value) => formatTokenCount(value) ?? '0'}
          />
          <UsageLineChart
            title="Output token"
            value={formatTokenCount(totals.outputTokens) ?? '0'}
            entries={entries}
            getValue={(entry) => entry.outputTokens ?? 0}
            color={theme.colors['graph-lilac']}
            formatValue={(value) => formatTokenCount(value) ?? '0'}
          />
          <UsageLineChart
            title="Total cost"
            value={
              totals.hasCost
                ? (formatTokenCost(totals.totalCost) ?? 'Not available')
                : 'Not available'
            }
            entries={totals.hasCost ? entries : []}
            getValue={(entry) => entry.totalCost ?? 0}
            color={theme.colors['graph-green']}
            formatValue={(value) => formatTokenCost(value) ?? '$0.00'}
          />
        </div>
      </WorkbenchGraphCard>
      <UsageByWorkbenchCard
        entries={entries}
        range={range}
        setRange={setRange}
        loading={loading}
      />
    </Flex>
  )
}

function RangeButtonGroup({
  range,
  setRange,
}: {
  range: UsageRangeOption
  setRange: (range: UsageRangeOption) => void
}) {
  return (
    <ButtonGroup
      size="small"
      directory={USAGE_RANGE_OPTIONS.map((option) => ({
        path: option,
        label: option,
      }))}
      tab={range}
      onClick={(key) => setRange(key as UsageRangeOption)}
    />
  )
}

function UsageLineChart({
  title,
  value,
  entries,
  getValue,
  color,
  formatValue,
}: {
  title: string
  value: string
  entries: UsageEntry[]
  getValue: (entry: UsageEntry) => number
  color: string
  formatValue: (value: number) => string
}) {
  const theme = useTheme()
  const layout = getUsageLayout(theme)
  const chartTheme = useChartTheme()
  const series = useMemo(
    () => buildAggregateSeries(entries, getValue),
    [entries, getValue]
  )
  const xTickValues = useMemo(() => getEdgeTickValues(series), [series])
  const lineChartTheme = {
    ...chartTheme,
    axis: {
      ...chartTheme.axis,
      ticks: {
        ...chartTheme.axis.ticks,
        text: {
          ...chartTheme.axis.ticks.text,
          fill: theme.colors['text-input-disabled'],
        },
      },
    },
  }
  const hasData = series.length > 0
  const isSinglePoint = series.length === 1
  const singlePointYValue = isSinglePoint ? Number(series[0]?.y ?? 0) : 0

  return (
    <Card
      css={{
        border: theme.borders.default,
        backgroundColor: theme.colors['fill-accent'],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        minHeight: layout.lineChartCardMinHeight,
        padding: theme.spacing.large,
      }}
    >
      <div>
        <CaptionP $color="text-xlight">{title}</CaptionP>
        <div
          css={{
            ...theme.partials.text.body2Bold,
            color: theme.colors.text,
          }}
        >
          {value}
        </div>
      </div>
      <div css={{ minHeight: layout.lineChartMinHeight }}>
        {hasData ? (
          <ResponsiveLine
            data={[{ id: title, data: series }]}
            animate
            theme={lineChartTheme}
            colors={[color]}
            margin={{
              top: theme.spacing.xsmall,
              right: theme.spacing.xsmall,
              bottom: theme.spacing.large,
              left: theme.spacing.xsmall,
            }}
            xScale={{ type: 'point' }}
            yScale={{
              type: 'linear',
              min: 0,
              max: isSinglePoint
                ? Math.max(singlePointYValue * 1.2, 1)
                : 'auto',
              stacked: false,
            }}
            axisLeft={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: theme.spacing.xsmall,
              tickRotation: 0,
              tickValues: xTickValues,
              renderTick: ({ tickIndex, value, x, y }) => {
                const isFirstTick = tickIndex === 0
                const isLastTick = tickIndex === xTickValues.length - 1
                const textAnchor = isFirstTick
                  ? 'start'
                  : isLastTick
                    ? 'end'
                    : 'middle'

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      dominantBaseline="central"
                      fill={theme.colors['text-input-disabled']}
                      style={theme.partials.text.caption}
                      textAnchor={textAnchor}
                      x={-4}
                      y={theme.spacing.medium}
                    >
                      {String(value)}
                    </text>
                  </g>
                )
              },
            }}
            enableArea={!isSinglePoint}
            areaOpacity={0.18}
            enableGridX={false}
            enableGridY={false}
            enablePoints={isSinglePoint}
            pointSize={theme.spacing.small}
            pointBorderWidth={theme.spacing.xxxsmall}
            pointBorderColor={theme.colors['fill-accent']}
            useMesh
            curve="linear"
            tooltip={({ point }) => (
              <ChartTooltip
                color={String(point.color)}
                label={String(point.data.x)}
                value={formatValue(Number(point.data.y))}
              />
            )}
          />
        ) : (
          <EmptyUsageState message="No usage data yet." />
        )}
      </div>
    </Card>
  )
}

function UsageByWorkbenchCard({
  entries,
  range,
  setRange,
  loading,
}: {
  entries: UsageEntry[]
  range: UsageRangeOption
  setRange: (range: UsageRangeOption) => void
  loading: boolean
}) {
  const theme = useTheme()
  const layout = getUsageLayout(theme)
  const rows = useMemo(
    () => deriveWorkbenchCostRows(entries, theme),
    [entries, theme]
  )
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0)
  const hasData = rows.length > 0 && totalCost > 0

  return (
    <WorkbenchGraphCard
      title="Usage by workbench"
      hint={
        <CaptionP $color="text-input-disabled">
          Total cost&nbsp;
          <span css={{ color: theme.colors['text-light'] }}>
            {formatTokenCost(totalCost)}
          </span>
        </CaptionP>
      }
      minContentHeight={layout.summaryCardMinHeight}
      rightContent={
        <RangeButtonGroup
          range={range}
          setRange={setRange}
        />
      }
      loading={loading}
    >
      {hasData ? (
        <Flex
          direction="column"
          gap="medium"
        >
          <Flex
            direction="column"
            gap="medium"
          >
            {rows.map((row) => (
              <div
                key={row.id}
                css={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(${layout.workbenchLabelMinWidth}px, 1fr) auto`,
                  gap: theme.spacing.small,
                }}
              >
                <CaptionP
                  $color="text-light"
                  css={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </CaptionP>
                <CaptionP $color="text">{formatTokenCost(row.cost)}</CaptionP>
                <ProgressBar
                  css={{ gridColumn: '1 / -1', marginTop: 0 }}
                  height={layout.progressBarHeight}
                  mode="determinate"
                  progress={row.cost / totalCost}
                  progressColor={row.color}
                  completeColor={row.color}
                />
              </div>
            ))}
          </Flex>
        </Flex>
      ) : (
        <EmptyUsageState message="No workbench cost data for this range." />
      )}
    </WorkbenchGraphCard>
  )
}

function EmptyUsageState({ message }: { message: string }) {
  const theme = useTheme()
  const layout = getUsageLayout(theme)

  return (
    <div
      css={{
        ...theme.partials.text.body2,
        color: theme.colors['text-xlight'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: layout.emptyStateMinHeight,
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  )
}

function deriveTotals(entries: UsageEntry[]): UsageTotals {
  return entries.reduce<UsageTotals>(
    (acc, entry) => {
      const inputTokens = entry.inputTokens ?? 0
      const outputTokens = entry.outputTokens ?? 0
      const totalCost = entry.totalCost

      acc.inputTokens += inputTokens
      acc.outputTokens += outputTokens
      acc.totalTokens += inputTokens + outputTokens

      if (totalCost != null) {
        acc.totalCost += totalCost
        acc.hasCost = true
      }

      return acc
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      hasCost: false,
    }
  )
}

function buildAggregateSeries(
  entries: UsageEntry[],
  getValue: (entry: UsageEntry) => number
) {
  const byTimestamp = new Map<string, number>()

  for (const entry of entries) {
    if (!entry.timestamp) continue

    byTimestamp.set(
      entry.timestamp,
      (byTimestamp.get(entry.timestamp) ?? 0) + getValue(entry)
    )
  }

  return [...byTimestamp.entries()]
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([timestamp, y], idx) => ({
      x: compactDateLabel(timestamp) ?? `t${idx + 1}`,
      y,
    }))
}

function getEdgeTickValues(series: Array<{ x: string; y: number }>) {
  if (series.length <= 1) return series.map(({ x }) => x)

  return [series[0].x, series[series.length - 1].x]
}

function deriveWorkbenchCostRows(entries: UsageEntry[], theme: DefaultTheme) {
  const byWorkbench = new Map<
    string,
    { id: string; name: string; cost: number }
  >()

  for (const entry of entries) {
    if (!entry.workbench?.id || entry.totalCost == null) continue

    const current = byWorkbench.get(entry.workbench.id) ?? {
      id: entry.workbench.id,
      name: entry.workbench.name,
      cost: 0,
    }

    current.cost += entry.totalCost
    byWorkbench.set(entry.workbench.id, current)
  }

  const colors = [
    theme.colors['graph-blue'],
    theme.colors['graph-lilac'],
    theme.colors['graph-green'],
    theme.colors['graph-red'],
  ]

  return [...byWorkbench.values()]
    .filter(({ cost }) => cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)
    .map((row, idx) => ({ ...row, color: colors[idx % colors.length] }))
}

const rangeToPeriod: Record<UsageRangeOption, EvalResultsPeriod> = {
  '1D': EvalResultsPeriod.Day,
  '1W': EvalResultsPeriod.Week,
  '1M': EvalResultsPeriod.Month,
}

function getUsageLayout(theme: DefaultTheme) {
  return {
    emptyStateMinHeight: theme.spacing.xxxxxlarge - theme.spacing.xsmall,
    graphMinHeight: theme.spacing.xxxxxlarge * 2 + theme.spacing.xxsmall,
    lineChartCardMinHeight: theme.spacing.xxxxxlarge * 2,
    lineChartMinHeight: theme.spacing.xxxxxlarge + theme.spacing.xxlarge,
    progressBarHeight: theme.spacing.xxsmall + theme.spacing.xxxsmall,
    statCardMinWidth: theme.spacing.xxxxxlarge * 2 + theme.spacing.large,
    summaryCardMinHeight: theme.spacing.xxxxxxlarge - theme.spacing.xsmall,
    workbenchLabelMinWidth: theme.spacing.xxxxxlarge - theme.spacing.xxlarge,
  }
}
