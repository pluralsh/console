import { EmptyState, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  DashboardTimeRangeAttributes,
  useWorkbenchMonitoringDashboardQuery,
  WorkbenchDashboardDetailsFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import {
  MetricsRangeControl,
  type MetricsTimeRange,
} from '../job/WorkbenchJobActivityResults'
import { toolDisplayName } from './dashboardToolIcon'
import {
  DashboardFilterValue,
  defaultDashboardFilter,
  WorkbenchDashboardFilters,
} from './WorkbenchDashboardFilters'
import { WorkbenchDashboardPanels } from './WorkbenchDashboardPanels'

export function DashboardDetail({ dashboardId }: { dashboardId: string }) {
  const { data, loading, error } = useWorkbenchMonitoringDashboardQuery({
    variables: { id: dashboardId },
    fetchPolicy: 'cache-and-network',
  })

  if (loading) return <MonitoringDetailSkeleton />
  if (error) return <GqlError error={error} />
  const dashboard = data?.workbenchDashboard
  if (!dashboard) return <EmptyState message="Dashboard not found." />

  return <DashboardDetailView dashboard={dashboard} />
}

function DashboardDetailView({
  dashboard,
}: {
  dashboard: WorkbenchDashboardDetailsFragment
}) {
  const graphs = useMemo(
    () => dashboard.graphs?.filter(isNonNullable) ?? [],
    [dashboard.graphs]
  )
  const inputs = useMemo(
    () => dashboard.inputs?.filter(isNonNullable) ?? [],
    [dashboard.inputs]
  )
  const [filters, setFilters] = useState<
    Record<string, DashboardFilterValue | undefined>
  >(() =>
    Object.fromEntries(
      inputs.map((input) => [input.name, defaultDashboardFilter(input)])
    )
  )
  const [range, setRange] = useState<MetricsTimeRange>('1d')

  const timeRange = useMemo<DashboardTimeRangeAttributes>(() => {
    const end = new Date()
    return {
      start: rangeStart(range, dashboard.insertedAt, end).toISOString(),
      end: end.toISOString(),
    }
  }, [range, dashboard.insertedAt])

  const variables = useMemo(() => {
    const out: Record<string, string | string[]> = {}
    for (const [name, value] of Object.entries(filters)) {
      if (value === undefined) continue
      if (Array.isArray(value) ? value.length === 0 : value === '') continue
      out[name] = value
    }
    return out
  }, [filters])

  const sources = useMemo(
    () =>
      [
        ...new Set(
          graphs.map((graph) => graph.datasource?.tool).filter(isNonNullable)
        ),
      ].map(toolDisplayName),
    [graphs]
  )

  return (
    <Flex
      direction="column"
      flex={1}
      minHeight={0}
    >
      <StripSC>
        <EyebrowSC>Dashboard</EyebrowSC>
        <CaptionP $color="text-xlight">
          {dashboard.updatedAt
            ? `Updated ${fromNow(dashboard.updatedAt)}`
            : 'Never updated'}
        </CaptionP>
      </StripSC>
      <BodySC>
        <TitleBlockSC>
          <TitleSC>{dashboard.name}</TitleSC>
          {dashboard.description && (
            <Body1P
              $color="text-long-form"
              css={{ letterSpacing: '0.25px' }}
            >
              {dashboard.description}
            </Body1P>
          )}
        </TitleBlockSC>
        <FiltersWrapSC>
          <WorkbenchDashboardFilters
            dashboardId={dashboard.id}
            inputs={inputs}
            values={filters}
            variables={variables}
            timeRange={timeRange}
            onChange={(name, value) =>
              setFilters((prev) => ({ ...prev, [name]: value }))
            }
            onClear={() =>
              setFilters(
                Object.fromEntries(
                  inputs.map((input) => [
                    input.name,
                    defaultDashboardFilter(input),
                  ])
                )
              )
            }
          />
        </FiltersWrapSC>
        <MetaRowSC>
          <Body2P $color="text-long-form">
            {metaText(graphs.length, sources)}
          </Body2P>
          <MetricsRangeControl
            value={range}
            onChange={setRange}
          />
        </MetaRowSC>
        <PanelsSC>
          <WorkbenchDashboardPanels
            dashboardId={dashboard.id}
            graphs={graphs}
            variables={variables}
            timeRange={timeRange}
          />
        </PanelsSC>
      </BodySC>
    </Flex>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

function rangeStart(
  range: MetricsTimeRange,
  insertedAt: Nullable<string>,
  end: Date
) {
  if (range === 'max') {
    // Max covers everything since the dashboard was created, capped at a year.
    const yearAgo = new Date(end.getTime() - 365 * DAY_MS)
    const created = insertedAt ? new Date(insertedAt) : null
    return created && created > yearAgo ? created : yearAgo
  }
  const days = range === '1d' ? 1 : range === '1m' ? 30 : 365
  return new Date(end.getTime() - days * DAY_MS)
}

function metaText(panelCount: number, sources: string[]) {
  if (panelCount === 0) return 'No panels yet'
  const panels = `${panelCount} ${panelCount === 1 ? 'panel' : 'panels'}`
  if (sources.length === 0) return panels
  const joined =
    sources.length === 1
      ? sources[0]
      : `${sources.slice(0, -1).join(', ')} and ${sources[sources.length - 1]}`
  return `${panels}, queried live from ${joined}`
}

export function MonitoringDetailSkeleton() {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <RectangleSkeleton
        $height="large"
        $width="40%"
      />
      <RectangleSkeleton
        $height="small"
        $width="70%"
      />
      <RectangleSkeleton $height={200} />
      <Flex gap="medium">
        <RectangleSkeleton $height={160} />
        <RectangleSkeleton $height={160} />
      </Flex>
    </Flex>
  )
}

const StripSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  // Bleeds to the DetailSC edges (padding 16px 24px) for a full-width bar.
  boxSizing: 'border-box',
  margin: '-16px -24px 0',
  // fill-one-selected matches Figma fill/one #21242C (pre-rename tokens).
  backgroundColor: theme.colors['fill-one-selected'],
  borderBottom: theme.borders.default,
  display: 'flex',
  gap: theme.spacing.small,
  height: 40,
  justifyContent: 'space-between',
  padding: `0 ${theme.spacing.medium}px`,
}))

const EyebrowSC = styled.p(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  margin: 0,
}))

const BodySC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero-selected'],
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  margin: `0 -${theme.spacing.large}px`,
  minHeight: 0,
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TitleBlockSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const TitleSC = styled.h2(({ theme }) => ({
  color: theme.colors.text,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  margin: 0,
}))

const FiltersWrapSC = styled.div(({ theme }) => ({
  marginTop: theme.spacing.large,
}))

const MetaRowSC = styled.div(({ theme }) => ({
  alignItems: 'flex-end',
  display: 'flex',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
  marginTop: theme.spacing.medium,
}))

const PanelsSC = styled.div(({ theme }) => ({
  marginTop: theme.spacing.medium,
}))
