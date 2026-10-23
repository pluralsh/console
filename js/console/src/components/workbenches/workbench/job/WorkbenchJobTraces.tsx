import { Body1BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  Chip,
  CloseIcon,
  ErrorIcon,
  Button,
  ExpandIcon,
  ModalWrapper,
  RadioGroup,
  SelectItem,
  Select,
  ListBoxItem,
  ChartBarStackedIcon,
  NetworkInterfaceIcon,
  IconFrame,
  StatusOkIcon,
  TreeViewIcon,
  WarningIcon,
  useResizeObserver,
} from '@pluralsh/design-system'
import { DragHandleSC } from 'components/ai/chatbot/SidePanelShared'
import { useResizablePane } from 'components/ai/chatbot/useResizeableChatPane'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { TraceTopology } from './WorkbenchJobTraceTopology'
import { traceBarColor } from './workbenchJobTraceColors'
import {
  formatDuration,
  formatOffset,
  formatSpanCount,
  formatTagValue,
  groupTraces,
  httpStatusDot,
  httpStatusFromAttribute,
  orderTraceSpans,
  serviceName,
  shortTraceId,
  spanDescription,
  spanLabel,
  traceBarPosition,
  traceBounds,
  type TraceSeverity,
  type TraceSpan,
  type TraceTreeMeta,
  traceSeverity,
  traceStatus,
  traceStatusLabel,
  traceStatusMessage,
  traceTicks,
  traceTreeMeta,
} from './workbenchJobTraceUtils'

// for containers with their own full screen button, which opens the trace's
// full screen layout rather than enlarging the container
export type TraceFullscreenControl = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  returnFocusRef?: RefObject<HTMLElement | null>
}

const TREE_STEP = 20
const TRACE_LABEL_MIN = 200
const TRACE_LABEL_DEFAULT = 256
const TRACE_LABEL_MAX = 560
// leave the bars enough room that widening the names cannot cover the timeline
const TRACE_TIMELINE_MIN = 220
const TRACE_LABEL_STORAGE_KEY = 'workbench-trace-label-width'

function traceLabelMax(containerWidth: number) {
  if (containerWidth <= 0) return TRACE_LABEL_MAX

  return Math.max(
    TRACE_LABEL_MIN,
    Math.min(TRACE_LABEL_MAX, containerWidth - TRACE_TIMELINE_MIN)
  )
}

export function TraceWaterfall({
  traces,
  summary,
  fullscreenControl,
}: {
  traces: TraceSpan[]
  summary?: Nullable<string>
  fullscreenControl?: TraceFullscreenControl
}) {
  const traceGroups = useMemo(() => groupTraces(traces), [traces])
  const [selectedTraceId, setSelectedTraceId] = useState<string>()
  const [view, setView] = useState<TraceView>('timeline')
  const [ownFullscreen, setOwnFullscreen] = useState(false)
  const fullscreen = fullscreenControl?.open ?? ownFullscreen
  const setFullscreen = fullscreenControl?.onOpenChange ?? setOwnFullscreen
  const fullscreenTriggerRef = useRef<HTMLDivElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const activeTrace =
    traceGroups.find(({ id }) => id === selectedTraceId) ?? traceGroups[0]

  const rows = useMemo(
    () => orderTraceSpans(activeTrace?.spans ?? []),
    [activeTrace?.spans]
  )
  const tree = useMemo(() => traceTreeMeta(rows), [rows])
  const [selectedSpanId, setSelectedSpanId] = useState<string>()
  const selectedRow =
    fullscreen && detailsOpen
      ? (rows.find(({ span }) => span.spanId === selectedSpanId) ?? rows[0])
      : undefined
  const bounds = useMemo(() => traceBounds(rows), [rows])
  const ticks = useMemo(() => (bounds ? traceTicks(bounds) : []), [bounds])
  const selectedParent = rows.find(
    ({ span }) => span.spanId === selectedRow?.span.parentId
  )
  const timelineRef = useRef<HTMLDivElement>(null)
  const [labelContainerWidth, setLabelContainerWidth] = useState(0)
  const onLabelContainerWidth = useCallback((next: number) => {
    setLabelContainerWidth((current) => (current === next ? current : next))
  }, [])
  useResizeObserver(timelineRef, ({ width }) =>
    onLabelContainerWidth(Math.floor(width))
  )
  const preferredLabelWidth =
    TRACE_LABEL_DEFAULT +
    rows.reduce((max, row) => Math.max(max, row.depth), 0) * TREE_STEP
  const labelMaxWidth = traceLabelMax(labelContainerWidth)
  const {
    calculatedPanelWidth: labelWidth,
    isDragging,
    dragHandleProps,
  } = useResizablePane(TRACE_LABEL_MIN, 100, undefined, {
    defaultWidthPx: Math.min(preferredLabelWidth, TRACE_LABEL_MAX),
    storageKey: TRACE_LABEL_STORAGE_KEY,
    maxWidthPx: labelMaxWidth,
    handleEdge: 'right',
  })

  if (!activeTrace || !rows.length || !bounds) return null

  const content = (
    <TraceWaterfallSC $fullscreen={fullscreen}>
      <TraceHeaderSC $fullscreen={fullscreen}>
        <TraceSummarySC $fullscreen={fullscreen}>
          <TraceIdChip
            id={activeTrace.id}
            title={activeTrace.id}
          />
          <TraceMetric
            label="Duration"
            value={formatDuration(bounds.end - bounds.start)}
          />
          <TraceMetric
            label="Spans"
            value={String(activeTrace.spans.length)}
          />
          <TraceMetric
            label="Services"
            value={String(new Set(activeTrace.spans.map(serviceName)).size)}
          />
          <TraceStatusMetricSC>
            <CaptionP $color="text-xlight">Status</CaptionP>
            <TraceStatusChip severity={traceStatus(activeTrace.spans)} />
          </TraceStatusMetricSC>
        </TraceSummarySC>
        <TraceToolbarActionsSC>
          <TraceViewControl
            value={view}
            onChange={setView}
          />
          {traceGroups.length > 1 && (
            <Select
              aria-label="Trace"
              selectedKey={activeTrace.id}
              size="small"
              onSelectionChange={(key) => {
                setSelectedTraceId(String(key))
                setSelectedSpanId(undefined)
                setDetailsOpen(false)
              }}
            >
              {traceGroups.map(({ id, spans }) => (
                <ListBoxItem
                  key={id}
                  label={`${shortTraceId(id)} · ${formatSpanCount(spans.length)}`}
                  textValue={id}
                />
              ))}
            </Select>
          )}
          {fullscreen ? (
            <Button
              secondary
              onClick={() => setFullscreen(false)}
            >
              Exit full screen
            </Button>
          ) : (
            !fullscreenControl && (
              <IconFrame
                clickable
                type="tertiary"
                size="large"
                icon={<ExpandIcon size={16} />}
                tooltip="Full screen"
                aria-label="Full screen"
                ref={fullscreenTriggerRef}
                onClick={() => setFullscreen(true)}
                css={{ marginLeft: 'auto' }}
              />
            )
          )}
        </TraceToolbarActionsSC>
      </TraceHeaderSC>
      {view === 'timeline' ? (
        <TraceTimelineContentSC $sideDetails={fullscreen && !!selectedRow}>
          <DragHandleSC
            role="separator"
            aria-label="Span list width"
            aria-orientation="vertical"
            aria-valuemin={TRACE_LABEL_MIN}
            aria-valuemax={labelMaxWidth}
            aria-valuenow={labelWidth}
            tabIndex={0}
            title="Drag to resize the span list"
            $isDragging={isDragging}
            css={{ left: labelWidth - 10 }}
            {...dragHandleProps}
          />
          <TimelineSC
            ref={timelineRef}
            $fullscreen={fullscreen}
            style={{ '--trace-label-width': `${labelWidth}px` }}
          >
            <TimelineHeaderSC>
              <CaptionP $color="text-xlight">SPAN</CaptionP>
              <TraceAxisSC>
                {ticks.map((tick) => (
                  <TraceTickSC
                    key={tick.position}
                    $position={tick.position}
                  >
                    <CaptionP $color="text-xlight">
                      {formatDuration(tick.offset)}
                    </CaptionP>
                  </TraceTickSC>
                ))}
              </TraceAxisSC>
            </TimelineHeaderSC>
            {rows.map((row, index) => {
              const selected = row.span.spanId === selectedRow?.span.spanId
              const service = row.span.service ?? 'unknown service'
              const duration = row.end - row.start
              const { left, width } = traceBarPosition(row, bounds)
              const severity = traceSeverity(row.span.tags)
              const color = traceBarColor(service)
              const label = spanLabel(row.span)
              const description = spanDescription(row.span)

              return (
                <TraceRowSC
                  key={row.span.spanId ?? `${row.span.name}-${row.start}`}
                  $selected={selected}
                  type="button"
                  onClick={() => {
                    setSelectedSpanId(row.span.spanId ?? undefined)
                    setDetailsOpen(true)
                    setFullscreen(true)
                  }}
                >
                  <TraceLabelSC>
                    <TraceTreeGutter
                      depth={row.depth}
                      meta={tree[index]}
                    />
                    <TraceDotWrapSC>
                      {tree[index]?.hasChildren && <TraceDotDownSC />}
                      <ServiceDotSC $color={color.accent} />
                    </TraceDotWrapSC>
                    <TraceNameStackSC
                      title={description ? `${label}\n${description}` : label}
                    >
                      <TraceNameSC>{label}</TraceNameSC>
                      {description && (
                        <TraceDescriptionSC>{description}</TraceDescriptionSC>
                      )}
                    </TraceNameStackSC>
                    <TraceBarStatusIcon severity={severity} />
                    <TraceDurationSC>
                      {formatDuration(duration)}
                    </TraceDurationSC>
                  </TraceLabelSC>
                  <TraceBarAreaSC>
                    <TraceBarSC
                      $accent={color.accent}
                      $fill={color.fill}
                      $left={left}
                      $width={width}
                      title={`${label} · ${service} · ${formatDuration(duration)}`}
                    >
                      <TraceBarTextSC $color={color.text}>
                        {label}
                      </TraceBarTextSC>
                      <TraceBarServiceSC $color={color.text}>
                        {service}
                      </TraceBarServiceSC>
                      <TraceBarStatusIcon severity={severity} />
                    </TraceBarSC>
                  </TraceBarAreaSC>
                </TraceRowSC>
              )
            })}
          </TimelineSC>
          {selectedRow && (
            <TraceDetailSC>
              <TraceDetailHeaderSC>
                <TraceDetailTitleSC>
                  <Body2P $color="text-light">
                    {spanLabel(selectedRow.span)}
                  </Body2P>
                  <IconFrame
                    clickable
                    icon={<CloseIcon />}
                    size="small"
                    tooltip="Close details"
                    type="tertiary"
                    onClick={(event) => {
                      event.stopPropagation()
                      setDetailsOpen(false)
                    }}
                  />
                </TraceDetailTitleSC>
                <Body1BoldP $color="text-light">
                  {formatDuration(selectedRow.end - selectedRow.start)}
                </Body1BoldP>
                <CaptionP $color="text-light">
                  offset {formatOffset(selectedRow.start - bounds.start)} from
                  root
                </CaptionP>
              </TraceDetailHeaderSC>
              <TraceDetailSectionSC>
                <CaptionP $color="text-xlight">Span</CaptionP>
                <TraceDetailFieldsSC>
                  <CaptionP $color="text-input-disabled">service</CaptionP>
                  <TraceServiceSC>
                    <ServiceDotSC
                      $color={
                        traceBarColor(
                          selectedRow.span.service ?? 'unknown service'
                        ).accent
                      }
                    />
                    <CaptionP $color="text-light">
                      {selectedRow.span.service ?? 'unknown service'}
                    </CaptionP>
                  </TraceServiceSC>
                  <CaptionP $color="text-input-disabled">status</CaptionP>
                  <TraceStatusChip
                    severity={traceSeverity(selectedRow.span.tags)}
                  />
                  {selectedParent && (
                    <>
                      <CaptionP $color="text-input-disabled">parent</CaptionP>
                      <TraceParentButtonSC
                        type="button"
                        onClick={() =>
                          setSelectedSpanId(
                            selectedParent.span.spanId ?? undefined
                          )
                        }
                      >
                        {spanLabel(selectedParent.span)}
                      </TraceParentButtonSC>
                    </>
                  )}
                </TraceDetailFieldsSC>
              </TraceDetailSectionSC>
              <TraceStatusMessage
                severity={traceSeverity(selectedRow.span.tags)}
                tags={selectedRow.span.tags}
              />
              <TraceAttributes tags={selectedRow.span.tags} />
            </TraceDetailSC>
          )}
        </TraceTimelineContentSC>
      ) : (
        <TraceTopology
          mode={view}
          spans={activeTrace.spans}
          fullscreen={fullscreen}
        />
      )}
      {summary && (
        <TraceCardNoteSC>
          <Body2P $color="text-light">{summary}</Body2P>
        </TraceCardNoteSC>
      )}
    </TraceWaterfallSC>
  )

  return (
    <>
      {!fullscreen && content}
      <ModalWrapper
        open={fullscreen}
        onOpenChange={setFullscreen}
        title={fullscreenControl?.title ?? 'Trace visualization'}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const returnFocusRef =
            fullscreenControl?.returnFocusRef ?? fullscreenTriggerRef
          requestAnimationFrame(() => returnFocusRef.current?.focus())
        }}
        css={{
          width: 'min(1500px, 100%)',
          maxHeight: '100%',
          overflow: 'hidden',
        }}
      >
        {fullscreen && content}
      </ModalWrapper>
    </>
  )
}

type TraceView = 'services' | 'spans' | 'timeline'

const TRACE_VIEWS: { label: string; value: TraceView }[] = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Span graph', value: 'spans' },
  { label: 'Service graph', value: 'services' },
]

function TraceMetric({ label, value }: { label: string; value: string }) {
  return (
    <TraceMetricSC>
      <CaptionP $color="text-xlight">{label}</CaptionP>
      <Body2P $color="text-light">{value}</Body2P>
    </TraceMetricSC>
  )
}

function TraceIdChip({ id, title }: { id: string; title: string }) {
  return (
    <TraceIdChipSC title={title}>
      <span>trace_id </span>
      <span>{id}</span>
    </TraceIdChipSC>
  )
}

function TraceStatusChip({ severity }: { severity: TraceSeverity }) {
  const Icon = traceStatusIcons[severity]

  return (
    <Chip
      fillLevel={2}
      icon={<Icon />}
      iconColor={traceStatusIconColor(severity)}
      severity={severity}
      size="small"
      css={{ height: 20 }}
    >
      {traceStatusLabel(severity)}
    </Chip>
  )
}

const traceStatusIcons = {
  danger: ErrorIcon,
  warning: WarningIcon,
  success: StatusOkIcon,
} as const

function traceStatusIconColor(severity: TraceSeverity) {
  switch (severity) {
    case 'danger':
      return 'icon-danger' as const
    case 'warning':
      return 'icon-warning' as const
    default:
      return 'icon-success' as const
  }
}

function TraceViewControl({
  value,
  onChange,
}: {
  value: TraceView
  onChange: (view: TraceView) => void
}) {
  return (
    <TraceViewControlSC
      aria-label="Trace view"
      orientation="horizontal"
      value={value}
      onChange={(next) => onChange(next as TraceView)}
    >
      {TRACE_VIEWS.map(({ label, value: option }) => (
        <TraceViewOptionSC
          key={option}
          value={option}
          aria-label={label}
          title={label}
          icon={<TraceViewIcon view={option} />}
        />
      ))}
    </TraceViewControlSC>
  )
}

function TraceViewIcon({ view }: { view: TraceView }) {
  switch (view) {
    case 'spans':
      return <NetworkInterfaceIcon />
    case 'services':
      return <TreeViewIcon />
    default:
      return <ChartBarStackedIcon />
  }
}

function TraceTreeGutter({
  depth,
  meta,
}: {
  depth: number
  meta: TraceTreeMeta
}) {
  if (!depth) return null

  return (
    <TraceTreeGutterSC $depth={depth}>
      {meta.ancestorContinues.map(
        (continues, index) =>
          continues && (
            <TraceTreeLineSC
              key={index}
              $kind="ancestor"
              $step={index}
            />
          )
      )}
      {depth > 0 && (
        <TraceTreeLineSC
          $kind="elbow"
          $step={depth - 1}
        />
      )}
    </TraceTreeGutterSC>
  )
}

function TraceStatusMessage({
  severity,
  tags,
}: {
  severity: TraceSeverity
  tags: Nullable<Record<string, unknown>>
}) {
  const message = traceStatusMessage(tags)
  if (!message || severity === 'success') return null

  return (
    <TraceDetailSectionSC>
      <CaptionP $color="text-xlight">{traceStatusLabel(severity)}</CaptionP>
      <TraceMessageSC>
        <CaptionP $color="text-light">{message}</CaptionP>
      </TraceMessageSC>
    </TraceDetailSectionSC>
  )
}

function TraceAttributes({
  tags,
}: {
  tags: Nullable<Record<string, unknown>>
}) {
  const entries = Object.entries(tags ?? {}).filter(
    ([, value]) => value != null && value !== ''
  )
  if (!entries.length) return null

  return (
    <TraceDetailSectionSC>
      <CaptionP $color="text-xlight">Attributes</CaptionP>
      <TraceDetailFieldsSC>
        {entries.map(([key, value]) => {
          const status = httpStatusFromAttribute(key, value)

          return (
            <FragmentPair
              key={key}
              label={key}
            >
              {status != null ? (
                <TraceServiceSC>
                  <ServiceDotSC $color={httpStatusDot(status)} />
                  <CaptionP $color="text-light">{String(status)}</CaptionP>
                </TraceServiceSC>
              ) : (
                <CaptionP
                  $color="text-light"
                  title={formatTagValue(value)}
                >
                  {formatTagValue(value)}
                </CaptionP>
              )}
            </FragmentPair>
          )
        })}
      </TraceDetailFieldsSC>
    </TraceDetailSectionSC>
  )
}

function FragmentPair({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <>
      <CaptionP $color="text-input-disabled">{label}</CaptionP>
      {children}
    </>
  )
}

function TraceBarStatusIcon({ severity }: { severity: TraceSeverity }) {
  if (severity === 'danger')
    return (
      <ErrorIcon
        color="icon-danger"
        size={16}
      />
    )
  if (severity === 'warning')
    return (
      <WarningIcon
        color="icon-warning"
        size={16}
      />
    )

  return null
}

const TraceWaterfallSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    containerType: 'inline-size',
    containerName: 'trace-view',
    color: theme.colors.text,
    background: theme.colors['fill-zero'],
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.large,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
    ...($fullscreen && {
      height: 'calc(100dvh - 96px)',
      maxHeight: 'calc(100dvh - 96px)',
    }),
  })
)

const TraceHeaderSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    boxShadow: `inset 0 -1px 0 ${theme.colors.border}`,
    display: 'flex',
    flexDirection: $fullscreen ? 'row' : 'column-reverse',
    alignItems: $fullscreen ? 'center' : 'stretch',
    justifyContent: 'space-between',
    flexShrink: 0,
    minHeight: $fullscreen ? 72 : 112,
    padding: theme.spacing.xsmall,
    gap: $fullscreen ? theme.spacing.large : 0,
    '@container trace-view (max-width: 1000px)': {
      flexDirection: 'column-reverse',
      alignItems: 'stretch',
      gap: 0,
    },
  })
)

const TraceSummarySC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    maxWidth: $fullscreen ? 648 : undefined,
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    gap: theme.spacing.large,
    minWidth: 0,
    padding: `${theme.spacing.xsmall} 0`,
    '@container trace-view (max-width: 560px)': {
      gap: theme.spacing.xsmall,
      flexWrap: 'wrap',
    },
  })
)

const TraceIdChipSC = styled.span(({ theme }) => ({
  ...theme.partials.text.code,
  flex: 1,
  minWidth: 100,
  overflow: 'hidden',
  padding: `0.375rem ${theme.spacing.small}`,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '> span:last-child': { color: theme.colors['text-xlight'] },
  '@container trace-view (max-width: 560px)': { flexBasis: '100%' },
}))

const TraceMetricSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: '0 0.625rem',
}))

const TraceStatusMetricSC = styled(TraceMetricSC)({
  alignItems: 'flex-start',
})

const TraceToolbarActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.medium,
  '.selectInner': { maxWidth: 240, minWidth: 0 },
  '.triggerButton .children': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
}))

const TraceViewControlSC = styled(RadioGroup)(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-zero'],
  border: theme.borders.default,
  borderRadius: 4,
  display: 'flex',
  flexShrink: 0,
  height: 40,
  padding: '0.125rem 0.25rem',
}))

const TraceViewOptionSC = styled(SelectItem)(({ theme }) => ({
  border: 'none',
  borderRadius: 3,
  padding: theme.spacing.xxsmall,
  height: 32,
  width: 32,
  '&:has(input:checked)': { background: theme.colors['fill-three'] },
}))

const TraceTimelineContentSC = styled.div<{ $sideDetails: boolean }>(
  ({ $sideDetails }) => ({
    display: 'grid',
    flex: 1,
    gridTemplateColumns: $sideDetails
      ? 'minmax(0, 1fr) 250px'
      : 'minmax(0, 1fr)',
    overflow: 'hidden',
    '@container trace-view (max-width: 800px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      overflowY: 'auto',
    },
    minHeight: 0,
    position: 'relative',
  })
)

const TimelineSC = styled.div<{ $fullscreen: boolean }>(({ $fullscreen }) => ({
  flex: 1,
  minHeight: 0,
  maxHeight: $fullscreen ? '100%' : 626,
  overflowX: 'auto',
  overflowY: 'auto',
}))

const TimelineHeaderSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gridTemplateColumns: 'var(--trace-label-width, 256px) minmax(0, 1fr)',
  minHeight: 50,
  position: 'sticky',
  top: 0,
  zIndex: 2,
  '> :first-child': {
    alignItems: 'center',
    display: 'flex',
    borderRight: theme.borders.default,
    padding: `0 ${theme.spacing.medium}`,
  },
  '@container trace-view (max-width: 560px)': {
    gridTemplateColumns: 'var(--trace-label-width, 256px) minmax(300px, 1fr)',
    minWidth: 'calc(var(--trace-label-width, 256px) + 300px)',
  },
}))

const TraceAxisSC = styled.div(({ theme }) => ({
  position: 'relative',
  margin: `0 ${theme.spacing.medium}`,
}))

const TraceTickSC = styled.div<{ $position: number }>(
  ({ theme, $position }) => ({
    position: 'absolute',
    left: `${$position}%`,
    width: 0,
    top: theme.spacing.medium,
    bottom: 0,
    borderLeft: theme.borders.default,
    '> p': {
      whiteSpace: 'nowrap',
      width: 'max-content',
      transform:
        $position === 100
          ? 'translateX(-100%)'
          : $position === 0
            ? undefined
            : 'translateX(-50%)',
      background: theme.colors['fill-zero'],
      paddingBottom: '0.125rem',
    },
  })
)

const TraceRowSC = styled.button<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    alignItems: 'stretch',
    background: $selected ? theme.colors['fill-three'] : 'transparent',
    border: 'none',
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: 'pointer',
    display: 'grid',
    gridTemplateColumns: 'var(--trace-label-width, 256px) minmax(0, 1fr)',
    height: 40,
    minHeight: 40,
    padding: 0,
    textAlign: 'left',
    width: '100%',
    zIndex: 0,
    '&:hover': { background: theme.colors['fill-one'] },
    '&:focus-visible': {
      outline: `1px solid ${theme.colors['border-outline-focused']}`,
      outlineOffset: -1,
    },
    '&:last-child > :last-child::after': { display: 'none' },
    '@container trace-view (max-width: 560px)': {
      gridTemplateColumns: 'var(--trace-label-width, 256px) minmax(300px, 1fr)',
      minWidth: 'calc(var(--trace-label-width, 256px) + 300px)',
    },
  })
)

const TraceLabelSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderRight: `1px solid ${theme.colors.border}`,
  display: 'flex',
  gap: 0,
  minWidth: 0,
  padding: `0 ${theme.spacing.medium}`,
}))

const TraceTreeGutterSC = styled.div<{ $depth: number }>(({ $depth }) => ({
  alignSelf: 'stretch',
  flexShrink: 0,
  position: 'relative',
  width: Math.max($depth * TREE_STEP, $depth > 0 ? TREE_STEP : 0),
}))

const TraceTreeLineSC = styled.span<{
  $kind: 'ancestor' | 'elbow'
  $step: number
}>(({ theme, $kind, $step }) => {
  const left = $step * TREE_STEP + 3

  if ($kind === 'ancestor')
    return {
      background: theme.colors.border,
      bottom: 0,
      left,
      position: 'absolute',
      top: 0,
      width: 1,
    }

  return {
    borderBottom: `1px solid ${theme.colors.border}`,
    borderLeft: `1px solid ${theme.colors.border}`,
    height: '50%',
    left,
    position: 'absolute',
    top: 0,
    width: TREE_STEP,
  }
})

const TraceDotWrapSC = styled.span({
  marginRight: '0.75rem',
  alignItems: 'center',
  alignSelf: 'stretch',
  display: 'flex',
  flexShrink: 0,
  position: 'relative',
})

const TraceDotDownSC = styled.span(({ theme }) => ({
  background: theme.colors.border,
  bottom: 0,
  left: 3,
  position: 'absolute',
  top: '50%',
  width: 1,
}))

const ServiceDotSC = styled.span<{ $color: string }>(({ $color }) => ({
  background: $color,
  borderRadius: '50%',
  flexShrink: 0,
  height: 8,
  width: 8,
}))

const TraceNameStackSC = styled.span({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  marginRight: '0.5rem',
})

const TraceNameSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceDescriptionSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceDurationSC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  ...theme.partials.text.mono,
  fontSize: '0.75rem',
  marginLeft: 'auto',
  paddingLeft: theme.spacing.xsmall,
  whiteSpace: 'nowrap',
}))

const TraceBarAreaSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  boxSizing: 'border-box',
  display: 'flex',
  minWidth: 0,
  margin: `0 ${theme.spacing.medium}`,
  height: '100%',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: theme.spacing['minus-medium'],
    right: theme.spacing['minus-medium'],
    bottom: 0,
    borderBottom: theme.borders.default,
  },
}))

const TraceBarSC = styled.span<{
  $accent: string
  $fill: string
  $left: number
  $width: number
}>(({ theme, $accent, $fill, $left, $width }) => ({
  alignItems: 'center',
  background: $fill,
  borderLeft: `3px solid ${$accent}`,
  borderRadius: 3,
  boxSizing: 'border-box',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  height: 20,
  marginLeft: `${$left}%`,
  overflow: 'hidden',
  padding: `0 0.5rem 0 0.625rem`,
  position: 'absolute',
  minWidth: 3,
  width: `${$width}%`,
}))

const TraceBarTextSC = styled.span<{ $color: string }>(({ $color }) => ({
  color: $color,
  flexShrink: 1,
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.025em',
  lineHeight: '1rem',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceBarServiceSC = styled.span<{ $color: string }>(({ $color }) => ({
  color: $color,
  flex: 1,
  fontSize: '0.75rem',
  letterSpacing: '0.025em',
  lineHeight: '1rem',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceDetailSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  borderLeft: theme.borders.default,
  minWidth: 0,
  minHeight: 0,
  overflowWrap: 'anywhere',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflowY: 'auto',
  padding: theme.spacing.medium,
  maxHeight: '100%',
  '@container trace-view (max-width: 800px)': {
    maxHeight: 300,
    borderLeft: 'none',
    borderTop: theme.borders.default,
  },
}))

const TraceDetailHeaderSC = styled.div(({ theme }) => ({
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gap: theme.spacing.xsmall,
  paddingBottom: theme.spacing.large,
}))

const TraceDetailTitleSC = styled.div(({ theme }) => ({
  alignItems: 'flex-start',
  display: 'flex',
  gap: theme.spacing.xxsmall,
  justifyContent: 'space-between',
}))

const TraceDetailSectionSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.xsmall,
  paddingBottom: theme.spacing.large,
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.colors.border}`,
  },
}))

const TraceDetailFieldsSC = styled.div(({ theme }) => ({
  '> *': { minWidth: 0, justifySelf: 'start' },
  alignItems: 'start',
  display: 'grid',
  gap: `${theme.spacing.xsmall} ${theme.spacing.xsmall}`,
  gridTemplateColumns: '77px minmax(0, 1fr)',
}))

const TraceServiceSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const TraceParentButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  color: theme.colors['action-link-inline'],
  cursor: 'pointer',
  textAlign: 'left',
  '&:hover': { textDecoration: 'underline' },
}))

const TraceMessageSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  padding: theme.spacing.xsmall,
}))

const TraceCardNoteSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  borderTop: `1px solid ${theme.colors.border}`,
  padding: theme.spacing.small,
}))
