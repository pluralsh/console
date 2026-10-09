import { EmptyState, Flex } from '@pluralsh/design-system'
import { TimeRangeControl } from 'components/utils/timerange/TimeRangeControl'
import {
  DEFAULT_TIME_RANGE,
  rangeWindow,
  startOfCurrentMinute,
  TIME_RANGE_PRESETS,
  type TimeRange,
} from 'components/utils/timerange/timeRange'
import { useTimeRange } from 'components/utils/timerange/useTimeRange'
import {
  DashboardTimeRangeAttributes,
  PublicWorkbenchDashboardQuery,
  usePublicWorkbenchDashboardQuery,
} from 'generated/graphql'
import { authlessClient } from 'helpers/client'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { PublicGraphSource } from '../workbench/monitoring/DashboardGraphSource'
import { MonitoringDetailSkeleton } from '../workbench/monitoring/WorkbenchDashboardDetail'
import { WorkbenchDashboardPanels } from '../workbench/monitoring/WorkbenchDashboardPanels'

const MAX_PUBLIC_RANGE_MS = 30 * 24 * 60 * 60 * 1000
const PUBLIC_PRESETS = TIME_RANGE_PRESETS.filter(
  (preset) => preset.durationMs <= MAX_PUBLIC_RANGE_MS
)
const NO_VARIABLES: Record<string, string> = {}

// every viewer shares one rate limit per dashboard, so the public page never
// ticks live: relative ranges are pinned to a fixed window when picked
const toFixedRange = (range: TimeRange): TimeRange =>
  range.live
    ? { live: false, ...rangeWindow(range, startOfCurrentMinute()) }
    : range

export function PublicWorkbenchDashboard() {
  const { publicId = '' } = useParams()
  const { data, loading, error } = usePublicWorkbenchDashboardQuery({
    client: authlessClient,
    variables: { publicId },
    skip: !publicId,
  })
  const dashboard = data?.publicWorkbenchDashboard

  if (loading && !dashboard) return <MonitoringDetailSkeleton />
  if (error || !dashboard)
    return (
      <PageSC>
        <EmptyState message="This dashboard isn't available" />
      </PageSC>
    )

  return (
    <PublicDashboardView
      publicId={publicId}
      dashboard={dashboard}
    />
  )
}

function PublicDashboardView({
  publicId,
  dashboard,
}: {
  publicId: string
  dashboard: NonNullable<
    PublicWorkbenchDashboardQuery['publicWorkbenchDashboard']
  >
}) {
  const theme = useTheme()
  const graphs = useMemo(
    () => dashboard.graphs?.filter(isNonNullable) ?? [],
    [dashboard.graphs]
  )
  const {
    range,
    now,
    timeWindow,
    revision: rangeRevision,
    setRange,
    selectWindow: onRangeSelect,
  } = useTimeRange(() => toFixedRange(DEFAULT_TIME_RANGE))
  const timeRange = useMemo<DashboardTimeRangeAttributes>(
    () => ({
      start: timeWindow.start.toISOString(),
      end: timeWindow.end.toISOString(),
    }),
    [timeWindow]
  )

  return (
    <PageSC>
      <HeaderSC>
        <Flex
          align="center"
          gap="medium"
        >
          <img
            src={
              theme.mode === 'light'
                ? '/plural-logo.png'
                : '/plural-logo-white.png'
            }
            alt="Plural"
            width={32}
            height={32}
          />
          <div>
            <TitleSC>{dashboard.name}</TitleSC>
            {dashboard.description && (
              <DescriptionSC>{dashboard.description}</DescriptionSC>
            )}
          </div>
        </Flex>
        <TimeRangeControl
          value={range}
          now={now}
          presets={PUBLIC_PRESETS}
          showLiveToggle={false}
          onChange={(next) => setRange(toFixedRange(next))}
        />
      </HeaderSC>
      <PanelsSC>
        <PublicGraphSource publicId={publicId}>
          <WorkbenchDashboardPanels
            graphs={graphs}
            variables={NO_VARIABLES}
            timeRange={timeRange}
            rangeRevision={rangeRevision}
            queriesEnabled
            onRangeSelect={onRangeSelect}
          />
        </PublicGraphSource>
      </PanelsSC>
    </PageSC>
  )
}

const PageSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-accent'],
  boxSizing: 'border-box',
  minHeight: '100vh',
  padding: theme.spacing.large,
  width: '100%',
}))

const HeaderSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
}))

const TitleSC = styled.h1(({ theme }) => ({
  ...theme.partials.text.mono,
  color: theme.colors.text,
  margin: 0,
}))

const DescriptionSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  margin: 0,
}))

const PanelsSC = styled.div(({ theme }) => ({
  marginTop: theme.spacing.large,
}))
