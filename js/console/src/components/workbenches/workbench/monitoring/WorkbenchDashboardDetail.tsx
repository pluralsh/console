import {
  EmptyState,
  ExpandIcon,
  Flex,
  HamburgerMenuCollapsedIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DashboardInputType,
  DashboardTimeRangeAttributes,
  Delta,
  useWorkbenchDashboardDeltaSubscription,
  WorkbenchDashboardDetailsFragment,
  WorkbenchDashboardInput,
  WorkbenchMonitoringDashboardQueryResult,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { TimeRangeControl } from 'components/utils/timerange/TimeRangeControl'
import {
  DEFAULT_TIME_RANGE,
  encodeDuration,
  rangeDurationMs,
} from 'components/utils/timerange/timeRange'
import { useTimeRange } from 'components/utils/timerange/useTimeRange'
import { DashboardTitleMenu } from './DashboardTitleMenu'
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
import { DashboardPublicShare } from './DashboardPublicShare'
import { AuthenticatedGraphSource, toPanelGraph } from './DashboardGraphSource'

export function DashboardDetail({
  dashboardId,
  query,
  onUpdate,
}: {
  dashboardId: string
  query: WorkbenchMonitoringDashboardQueryResult
  onUpdate?: () => void
}) {
  const { data, loading, error } = query
  const { data: deltaData } = useWorkbenchDashboardDeltaSubscription({
    variables: { id: dashboardId },
  })
  const event = deltaData?.workbenchDashboardDelta
  const dashboard =
    event?.delta === Delta.Delete
      ? null
      : (event?.payload ?? data?.workbenchDashboard)

  if (loading && !dashboard) return <MonitoringDetailSkeleton />
  if (error) return <GqlError error={error} />
  if (!dashboard)
    return (
      <MainSC>
        <EmptyState message="Dashboard not found." />
      </MainSC>
    )

  return (
    <DashboardDetailView
      dashboard={dashboard}
      onUpdate={onUpdate}
    />
  )
}

function DashboardDetailView({
  dashboard,
  onUpdate,
}: {
  dashboard: WorkbenchDashboardDetailsFragment
  onUpdate?: () => void
}) {
  const { pathname, search } = useLocation()
  const graphs = useMemo(
    () => dashboard.graphs?.filter(isNonNullable).map(toPanelGraph) ?? [],
    [dashboard.graphs]
  )
  const allInputs = useMemo(
    () => dashboard.inputs?.filter(isNonNullable) ?? [],
    [dashboard.inputs]
  )
  const inputs = useMemo(
    () => allInputs.filter((input) => !isTimeRangeInput(input)),
    [allInputs]
  )
  const rangeInputs = useMemo(
    () => allInputs.filter(isTimeRangeInput),
    [allInputs]
  )
  const shared = useMemo(() => parseMonitoringShareSearch(search), [search])
  const inputSignature = inputs
    .map((input) => `${input.name}:${input.type}:${!!input.datasource}`)
    .join('|')
  const [filters, setFilters] = useState<
    Record<string, DashboardFilterValue | undefined>
  >(() => initialDashboardFilters(inputs, shared.variables))
  const [readyInputs, setReadyInputs] = useState<Record<string, boolean>>({})
  const [trackedInputSignature, setTrackedInputSignature] =
    useState(inputSignature)
  const [initializedInputSignature, setInitializedInputSignature] = useState<
    string | null
  >(null)
  const {
    range,
    now,
    timeWindow,
    revision: rangeRevision,
    setRange: onRangeChange,
    selectWindow: onRangeSelect,
  } = useTimeRange(() => shared.range ?? DEFAULT_TIME_RANGE)

  const timeRange = useMemo<DashboardTimeRangeAttributes>(
    () => ({
      start: timeWindow.start.toISOString(),
      end: timeWindow.end.toISOString(),
    }),
    [timeWindow]
  )

  const rangeDuration = encodeDuration(rangeDurationMs(range))
  const variables = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [name, value] of Object.entries(filters)) {
      if (value === undefined) continue
      if (value === '') continue
      out[name] = value
    }
    for (const input of rangeInputs) out[input.name] = rangeDuration
    return out
  }, [filters, rangeInputs, rangeDuration])
  const onInputReadyChange = useCallback((name: string, ready: boolean) => {
    setReadyInputs((current) =>
      current[name] === ready ? current : { ...current, [name]: ready }
    )
  }, [])
  const inputDefinitionChanged = trackedInputSignature !== inputSignature
  if (inputDefinitionChanged) {
    setTrackedInputSignature(inputSignature)
    setFilters((current) =>
      reconcileDashboardFilters(inputs, shared.variables, current)
    )
    setReadyInputs({})
    setInitializedInputSignature(null)
  }
  const inputsReady =
    !inputDefinitionChanged && inputs.every((input) => readyInputs[input.name])
  if (
    inputs.length > 0 &&
    inputsReady &&
    initializedInputSignature !== inputSignature
  ) {
    setInitializedInputSignature(inputSignature)
  }
  const dashboardReady =
    inputs.length === 0 ||
    (!inputDefinitionChanged &&
      (inputsReady || initializedInputSignature === inputSignature))

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

  const main = (
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
              active={!!dashboard.publicId}
            >
              <DashboardPublicShare
                dashboardId={dashboard.id}
                publicId={dashboard.publicId}
              />
            </WorkbenchMonitoringSharePopover>
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
            <DashboardTitleMenu
              name={dashboard.name}
              description={dashboard.description}
              updatedAt={dashboard.updatedAt}
              bare={!hasFilters}
            />
            {fullscreen && (
              <ExitFullscreenButton onClick={() => setFullscreen(false)} />
            )}
          </TitleRowSC>
          <ToolbarSC $hasFilters={hasFilters}>
            {!hasFilters && dashboard.description && (
              <DescriptionSC title={dashboard.description}>
                {dashboard.description}
              </DescriptionSC>
            )}
            {hasFilters && (
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
                onReadyChange={onInputReadyChange}
              />
            )}
            <TimeRangeControl
              css={{ marginLeft: 'auto' }}
              value={range}
              now={now}
              onChange={onRangeChange}
            />
          </ToolbarSC>
          <PanelsSC>
            <AuthenticatedGraphSource dashboardId={dashboard.id}>
              <WorkbenchDashboardPanels
                graphs={graphs}
                variables={variables}
                timeRange={timeRange}
                rangeRevision={rangeRevision}
                queriesEnabled={dashboardReady}
                onRangeSelect={onRangeSelect}
                onUpdate={onUpdate}
              />
            </AuthenticatedGraphSource>
          </PanelsSC>
        </BodySC>
      </ScrollSC>
    </MainSC>
  )

  // Portal fullscreen to body so it covers the app sidebar; ancestors with
  // container queries / overflow otherwise trap position:fixed.
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
      {fullscreen ? createPortal(main, document.body) : main}
    </DefinitionPanelShell>
  )
}

/**
 * Time-range inputs duplicate the global range control, so they're hidden and
 * receive the selected window's duration (e.g. `1h`) for any query that still
 * references them.
 */
function isTimeRangeInput(input: WorkbenchDashboardInput) {
  return input.type === DashboardInputType.TimeRange
}

function initialDashboardFilters(
  inputs: WorkbenchDashboardInput[],
  sharedVariables: Record<string, string | string[]>
) {
  return Object.fromEntries(
    inputs.map((input) => [
      input.name,
      initialDashboardFilter(input, sharedVariables),
    ])
  )
}

function initialDashboardFilter(
  input: WorkbenchDashboardInput,
  sharedVariables: Record<string, string | string[]>
) {
  const shared = sharedVariables[input.name]
  if (shared === undefined) return defaultDashboardFilter(input)
  return Array.isArray(shared) ? (shared[0] ?? '') : shared
}

function reconcileDashboardFilters(
  inputs: WorkbenchDashboardInput[],
  sharedVariables: Record<string, string | string[]>,
  current: Record<string, DashboardFilterValue | undefined>
) {
  const next = Object.fromEntries(
    inputs.map((input) => [
      input.name,
      Object.hasOwn(current, input.name)
        ? current[input.name]
        : initialDashboardFilter(input, sharedVariables),
    ])
  )
  const unchanged =
    Object.keys(current).length === Object.keys(next).length &&
    Object.entries(next).every(([name, value]) => current[name] === value)
  return unchanged ? current : next
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
  // Above the tab strip (z-index 1) without trapping fullscreen stacking.
  position: 'relative',
  zIndex: 2,
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

const ScrollSC = styled.div({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
})

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  paddingBottom: theme.spacing.large,
}))

const TitleRowSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
}))

const ToolbarSC = styled.div<{ $hasFilters: boolean }>(
  ({ theme, $hasFilters }) => ({
    alignItems: $hasFilters ? 'flex-end' : 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
    justifyContent: 'space-between',
    marginTop: theme.spacing.small,
  })
)

const DescriptionSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  flex: '1 1 240px',
  margin: 0,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const PanelsSC = styled.div(({ theme }) => ({
  marginTop: theme.spacing.medium,
}))
