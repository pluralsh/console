import { ResponsiveLine } from '@nivo/line'
import {
  ListBoxItem,
  Select,
  SemanticColorKey,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { WorkbenchGraphCard } from 'components/workbenches/common/WorkbenchGraphCard'
import { GqlError } from 'components/utils/Alert'
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { useChartTheme } from 'components/utils/charts'
import { TRUNCATE } from 'components/utils/truncate'
import { InlineA } from 'components/utils/typography/Text'
import {
  EvalResultsPeriod,
  WorkbenchEvalResultsWorkbenchAverage,
  useWorkbenchesEvalsAvgTimelineGraphQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'

const MAX_GRADE = 10

export function WorkbenchesEvalsAvgTimelineGraph() {
  const theme = useTheme()
  const chartTheme = useChartTheme()
  const [range, setRange] = useState<RangeSelectorOption>('1W')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { data, loading, error } = useWorkbenchesEvalsAvgTimelineGraphQuery({
    variables: { period: rangeToPeriod[range] },
    fetchPolicy: 'cache-and-network',
  })

  if (error) return <GqlError error={error} />

  const series = useMemo(
    () => buildSeries(data?.averageWorkbenchEvalResults ?? [], theme),
    [data?.averageWorkbenchEvalResults, theme]
  )

  const selectableSeries = series
  const selectableIdSet = new Set(selectableSeries.map((item) => item.id))
  const activeSelectedIds = selectedIds.filter((id) => selectableIdSet.has(id))
  const visibleSeries = activeSelectedIds.length
    ? selectableSeries.filter((item) => activeSelectedIds.includes(item.id))
    : selectableSeries
  const hasData = visibleSeries.length > 0

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
        {hasData ? (
          <>
            {selectableSeries.length > 6 ? (
              <Select
                label="Filter by workbenches"
                leftContent={<WorkbenchIcon size={16} />}
                selectionMode="multiple"
                selectedKeys={activeSelectedIds}
                onSelectionChange={(keys) =>
                  setSelectedIds(Array.from(keys).map(String))
                }
                dropdownFooterFixed={
                  activeSelectedIds.length > 0 ? (
                    <div
                      css={{
                        borderTop: theme.borders.default,
                        padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
                        width: '100%',
                      }}
                    >
                      <InlineA
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedIds([])
                        }}
                      >
                        Clear selection
                      </InlineA>
                    </div>
                  ) : null
                }
              >
                {selectableSeries.map((item) => (
                  <ListBoxItem
                    key={item.id}
                    label={item.label}
                    leftContent={
                      <span
                        css={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: item.color,
                          flexShrink: 0,
                        }}
                      />
                    }
                  />
                ))}
              </Select>
            ) : (
              <div
                css={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: theme.spacing.small,
                }}
              >
                {selectableSeries.map((item) => {
                  const selected = activeSelectedIds.includes(item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSelectedIds((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id]
                        )
                      }
                      css={{
                        appearance: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: theme.borders.default,
                        borderRadius: theme.borderRadiuses.medium,
                        padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xsmall,
                        background: selected
                          ? theme.colors['fill-two-selected']
                          : theme.colors['fill-zero'],
                        transition: 'background 120ms ease',
                        '&:hover': {
                          background: selected
                            ? theme.colors['fill-two-selected']
                            : theme.colors['fill-one-hover'],
                        },
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
                          ...theme.partials.text.caption,
                          color: theme.colors['text-xlight'],
                          ...TRUNCATE,
                        }}
                      >
                        {item.label}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div css={{ minHeight: 200, width: '100%', flex: 1 }}>
              <ResponsiveLine
                data={visibleSeries.map((item) => ({
                  id: item.label,
                  data: item.data,
                }))}
                theme={chartTheme}
                colors={visibleSeries.map((item) => item.color)}
                margin={{ top: 8, right: 16, bottom: 32, left: 48 }}
                xScale={{ type: 'point' }}
                yScale={{
                  type: 'linear',
                  min: 0,
                  max: MAX_GRADE,
                  stacked: false,
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickValues: [0, 2, 4, 6, 8, 10],
                }}
                axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
                enablePoints={false}
                enableGridX={false}
                enableGridY
                gridYValues={[0, 2, 4, 6, 8, 10]}
                useMesh
                curve="linear"
              />
            </div>
          </>
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
            No workbench grade timeline yet.
          </div>
        )}
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
