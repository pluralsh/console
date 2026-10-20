import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { formatRangeText, type TimeWindow } from './timeRange'

const SELECTION_SHADOW = 'rgba(2, 3, 24, 0.55)'
const SELECTION_EDGE = '#747af6'
const MIN_DRAG_PX = 4

type Drag = { startX: number; currentX: number; width: number }
type Margin = { top: number; right: number; bottom: number; left: number }

/**
 * Wraps a time-series chart whose x axis spans `timeWindow` and lets the user
 * drag across the plot area (inset by `margin`) to select a sub-window.
 */
export function ChartRangeSelect({
  timeWindow,
  margin,
  onRangeSelect,
  style,
  children,
}: {
  timeWindow: TimeWindow
  margin: Margin
  onRangeSelect?: (start: Date, end: Date) => void
  style?: CSSProperties
  children: ReactNode
}) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef(drag)
  const contextRef = useRef({ timeWindow, onRangeSelect })

  useLayoutEffect(() => {
    dragRef.current = drag
    contextRef.current = { timeWindow, onRangeSelect }
  })

  const isDragging = drag !== null

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const x = plotX(plotRef.current, e.clientX)
      setDrag((current) => (current ? { ...current, currentX: x } : current))
    }

    const onUp = (e: MouseEvent) => {
      const current = dragRef.current
      setDrag(null)
      if (!current) return
      const x = plotX(plotRef.current, e.clientX)
      if (Math.abs(x - current.startX) < MIN_DRAG_PX) return
      const { timeWindow, onRangeSelect } = contextRef.current
      onRangeSelect?.(
        xToDate(Math.min(current.startX, x), current.width, timeWindow),
        xToDate(Math.max(current.startX, x), current.width, timeWindow)
      )
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  const onMouseDown = (e: ReactMouseEvent) => {
    const plot = plotRef.current
    if (!onRangeSelect || e.button !== 0 || !plot) return
    const rect = plot.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      return
    e.preventDefault()
    const x = plotX(plot, e.clientX)
    setDrag({ startX: x, currentX: x, width: rect.width })
  }

  const selection =
    drag && Math.abs(drag.currentX - drag.startX) >= MIN_DRAG_PX
      ? {
          left: Math.min(drag.startX, drag.currentX),
          width: Math.abs(drag.currentX - drag.startX),
        }
      : null

  return (
    <WrapSC
      $selectable={!!onRangeSelect}
      style={style}
      onMouseDown={onMouseDown}
    >
      {children}
      <PlotSC
        ref={plotRef}
        style={{
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left,
        }}
      >
        {onRangeSelect && !drag && <DragHintSC>Drag to zoom</DragHintSC>}
        {drag && selection && (
          <>
            <ShadowSC style={{ left: 0, width: selection.left }} />
            <ShadowSC
              style={{ left: selection.left + selection.width, right: 0 }}
            />
            <SelectionSC style={selection}>
              <SelectionLabelSC>
                {formatRangeText(
                  {
                    live: false,
                    start: xToDate(selection.left, drag.width, timeWindow),
                    end: xToDate(
                      selection.left + selection.width,
                      drag.width,
                      timeWindow
                    ),
                  },
                  timeWindow.end
                )}
              </SelectionLabelSC>
            </SelectionSC>
          </>
        )}
      </PlotSC>
    </WrapSC>
  )
}

function plotX(plot: HTMLElement | null, clientX: number) {
  if (!plot) return 0
  const rect = plot.getBoundingClientRect()
  return Math.min(Math.max(clientX - rect.left, 0), rect.width)
}

function xToDate(x: number, width: number, { start, end }: TimeWindow) {
  const span = end.getTime() - start.getTime()
  return new Date(start.getTime() + (width > 0 ? (x / width) * span : 0))
}

const DAY_MS = 24 * 60 * 60 * 1000

/** d3 time format for x-axis ticks, plus its rendered width in characters. */
export function timeAxisFormat({ start, end }: TimeWindow) {
  const durationMs = end.getTime() - start.getTime()
  if (durationMs <= DAY_MS) return { format: '%H:%M', labelChars: 5 }
  if (durationMs <= 3 * DAY_MS) return { format: '%b %d %H:%M', labelChars: 12 }
  return { format: '%b %d', labelChars: 6 }
}

const DragHintSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-xlight'],
  display: 'flex',
  opacity: 0,
  padding: `0 ${theme.spacing.xsmall}px`,
  position: 'absolute',
  right: 4,
  top: 4,
  transition: 'opacity 0.15s ease',
  whiteSpace: 'nowrap',
  zIndex: 1,
}))

const WrapSC = styled.div<{ $selectable: boolean }>(({ $selectable }) => ({
  position: 'relative',
  width: '100%',
  ...($selectable && {
    cursor: 'crosshair',
    userSelect: 'none',
    [`&:hover ${DragHintSC}`]: { opacity: 1 },
  }),
}))

const PlotSC = styled.div({
  pointerEvents: 'none',
  position: 'absolute',
})

const ShadowSC = styled.div({
  background: SELECTION_SHADOW,
  bottom: 0,
  position: 'absolute',
  top: 0,
})

const SelectionSC = styled.div({
  borderLeft: `2px solid ${SELECTION_EDGE}`,
  borderRight: `2px solid ${SELECTION_EDGE}`,
  bottom: 0,
  position: 'absolute',
  top: 0,
})

const SelectionLabelSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  boxShadow: theme.boxShadows.moderate,
  color: theme.colors.text,
  left: '50%',
  padding: `2px ${theme.spacing.xsmall}px`,
  position: 'absolute',
  top: 4,
  transform: 'translateX(-50%)',
  whiteSpace: 'nowrap',
  zIndex: 1,
}))
