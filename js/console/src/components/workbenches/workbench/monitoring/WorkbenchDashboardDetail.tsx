import {
  EmptyState,
  ExpandIcon,
  Flex,
  HamburgerMenuCollapsedIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  DashboardInputType,
  DashboardTimeRangeAttributes,
  useWorkbenchMonitoringDashboardQuery,
  WorkbenchDashboardDetailsFragment,
  WorkbenchDashboardInput,
} from 'generated/graphql'
import { uniq } from 'lodash'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import {
  MetricsRangeControl,
  type MetricsTimeRange,
} from '../job/WorkbenchJobActivityResults'
import { toolDisplayName } from './dashboardToolIcon'
import { dashboardDefinitionYaml } from './definitionYaml'
import { ExitFullscreenButton } from './ExitFullscreenButton'
import { parseMonitoringShareSearch } from './monitoringShare'
import {
  DefinitionPanelShell,
  useDefinitionPanelContainer,
  WorkbenchMonitoringDefinitionPanel,
} from './WorkbenchMonitoringDefinitionPanel'
import { WorkbenchMonitoringSharePopover } from './WorkbenchMonitoringSharePopover'
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

  if (loading && !data) return <MonitoringDetailSkeleton />
  if (error) return <GqlError error={error} />
  const dashboard = data?.workbenchDashboard
  if (!dashboard)
    return (
      <MainSC>
        <EmptyState message="Dashboard not found." />
      </MainSC>
    )

  return <DashboardDetailView dashboard={dashboard} />
}

function DashboardDetailView({
  dashboard,
}: {
  dashboard: WorkbenchDashboardDetailsFragment
}) {
  const { pathname, search } = useLocation()
  const graphs = useMemo(
    () => dashboard.graphs?.filter(isNonNullable) ?? [],
    [dashboard.graphs]
  )
  const inputs = useMemo(
    () => dashboard.inputs?.filter(isNonNullable) ?? [],
    [dashboard.inputs]
  )
  const shared = useMemo(() => parseMonitoringShareSearch(search), [search])
  const [filters, setFilters] = useState<
    Record<string, DashboardFilterValue | undefined>
  >(() => initialDashboardFilters(inputs, shared.variables))
  const [range, setRange] = useState<MetricsTimeRange>(
    () => shared.range ?? '1d'
  )

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
      uniq(
        graphs.map((graph) => graph.datasource?.tool).filter(isNonNullable)
      ).map(toolDisplayName),
    [graphs]
  )

  const hasFilters = inputs.length > 0
  const [definitionOpen, setDefinitionOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenTriggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useDefinitionPanelContainer()
  const definitionYaml = useMemo(
    () => dashboardDefinitionYaml(dashboard),
    [dashboard]
  )

  const openFullscreen = () => {
    setDefinitionOpen(false)
    setFullscreen(true)
  }

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  useEffect(() => {
    if (fullscreen) return
    requestAnimationFrame(() => fullscreenTriggerRef.current?.focus())
  }, [fullscreen])

  return (
    <DefinitionPanelShell
      containerRef={containerRef}
      panel={
        <WorkbenchMonitoringDefinitionPanel
          open={definitionOpen && !fullscreen}
          onClose={() => setDefinitionOpen(false)}
          yaml={definitionYaml}
          containerRef={containerRef}
        />
      }
    >
      <MainSC $fullscreen={fullscreen}>
        {!fullscreen && (
          <StripSC>
            <EyebrowSC>Dashboard</EyebrowSC>
            <StripActionsSC>
              <CaptionP $color="text-xlight">
                {dashboard.updatedAt
                  ? `updated ${fromNow(dashboard.updatedAt)}`
                  : 'Never updated'}
              </CaptionP>
              <WorkbenchMonitoringSharePopover
                kind="dashboard"
                pathname={pathname}
                range={range}
                variables={variables}
              />
              <IconFrame
                ref={fullscreenTriggerRef}
                clickable
                size="small"
                type="tertiary"
                icon={<ExpandIcon />}
                textValue="Full screen"
                onClick={openFullscreen}
              />
              <IconFrame
                clickable
                size="small"
                type="tertiary"
                icon={<HamburgerMenuCollapsedIcon />}
                textValue="Definition"
                onClick={() => setDefinitionOpen(true)}
              />
            </StripActionsSC>
          </StripSC>
        )}
        <ScrollSC>
          <BodySC>
            <TitleRowSC>
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
                {fullscreen && (
                  <CaptionP $color="text-xlight">
                    {dashboard.updatedAt
                      ? `updated ${fromNow(dashboard.updatedAt)}`
                      : 'Never updated'}
                  </CaptionP>
                )}
              </TitleBlockSC>
              {fullscreen && (
                <ExitFullscreenButton onClick={() => setFullscreen(false)} />
              )}
            </TitleRowSC>
            <ToolbarSC $hasFilters={hasFilters}>
              {hasFilters ? (
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
              ) : (
                <Body2P $color="text-long-form">
                  {metaText(graphs.length, sources)}
                </Body2P>
              )}
              <MetricsRangeControl
                value={range}
                onChange={setRange}
              />
            </ToolbarSC>
            {hasFilters && (
              <MetaRowSC>
                <Body2P $color="text-long-form">
                  {metaText(graphs.length, sources)}
                </Body2P>
              </MetaRowSC>
            )}
            <PanelsSC>
              <WorkbenchDashboardPanels
                dashboardId={dashboard.id}
                graphs={graphs}
                variables={variables}
                timeRange={timeRange}
              />
            </PanelsSC>
          </BodySC>
        </ScrollSC>
      </MainSC>
    </DefinitionPanelShell>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

function initialDashboardFilters(
  inputs: WorkbenchDashboardInput[],
  sharedVariables: Record<string, string | string[]>
) {
  return Object.fromEntries(
    inputs.map((input) => {
      const shared = sharedVariables[input.name]
      if (shared === undefined)
        return [input.name, defaultDashboardFilter(input)]
      if (input.type === DashboardInputType.MultiSelect) {
        return [
          input.name,
          Array.isArray(shared) ? shared : shared ? [shared] : [],
        ]
      }
      return [input.name, Array.isArray(shared) ? (shared[0] ?? '') : shared]
    })
  )
}

function rangeStart(
  range: MetricsTimeRange,
  insertedAt: Nullable<string>,
  end: Date
) {
  if (range === 'max') {
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
    <MainSC>
      <StripSC>
        <RectangleSkeleton
          $height={16}
          $width={96}
        />
        <RectangleSkeleton
          $height={16}
          $width={160}
        />
      </StripSC>
      <ScrollSC>
        <BodySC>
          <RectangleSkeleton
            $height="large"
            $width="40%"
          />
          <RectangleSkeleton
            $height="small"
            $width="70%"
            style={{ marginTop: 8 }}
          />
          <RectangleSkeleton
            $height={40}
            $width="100%"
            style={{ marginTop: 24 }}
          />
          <Flex
            gap="medium"
            marginTop="medium"
          >
            <RectangleSkeleton $height={200} />
            <RectangleSkeleton $height={200} />
          </Flex>
        </BodySC>
      </ScrollSC>
    </MainSC>
  )
}

const MainSC = styled.div<{ $fullscreen?: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    ...($fullscreen && {
      backgroundColor: theme.colors['fill-accent'],
      height: '100%',
      inset: 0,
      position: 'fixed',
      width: '100%',
      zIndex: theme.zIndexes.modal,
    }),
  })
)

const StripSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  boxSizing: 'border-box',
  // fill-one-selected matches Figma fill/one #21242C (pre-rename tokens).
  backgroundColor: theme.colors['fill-one-selected'],
  borderBottom: theme.borders.default,
  borderTop: theme.borders.default,
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.small,
  height: 40,
  justifyContent: 'space-between',
  padding: `0 ${theme.spacing.medium}px`,
  position: 'relative',
  zIndex: 1,
}))

const StripActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
}))

const EyebrowSC = styled.p(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  margin: 0,
}))

const ScrollSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'auto',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const BodySC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
})

const TitleBlockSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const TitleRowSC = styled.div(({ theme }) => ({
  alignItems: 'flex-start',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
}))

const TitleSC = styled.h2(({ theme }) => ({
  color: theme.colors.text,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  margin: 0,
}))

const ToolbarSC = styled.div<{ $hasFilters: boolean }>(
  ({ theme, $hasFilters }) => ({
    alignItems: $hasFilters ? 'flex-end' : 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
    justifyContent: 'space-between',
    marginTop: theme.spacing.large,
  })
)

const MetaRowSC = styled.div(({ theme }) => ({
  marginTop: theme.spacing.medium,
}))

const PanelsSC = styled.div(({ theme }) => ({
  marginTop: theme.spacing.medium,
}))
