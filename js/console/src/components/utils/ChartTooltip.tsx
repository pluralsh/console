import { AnimatedDiv, Card } from '@pluralsh/design-system'
import { useSpring } from '@react-spring/web'
import { CSSProperties, Fragment, ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled, { useTheme } from 'styled-components'

import { useCursorPosition } from './CursorPosition'
import { LineSeries, PointTooltipProps, SliceTooltipProps } from '@nivo/line'

const TooltipSC = styled.div.attrs(() => ({}))((_) => ({
  width: '0',
  height: '0',
}))
const TooltipContentSC = styled(Card).attrs(() => ({
  fillLevel: 2,
}))(({ theme }) => ({
  '&&': {
    ...theme.partials.text.caption,
    display: 'flex',
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
    alignItems: 'center',
    gap: theme.spacing.xsmall,
    transform: `translate(-50%, calc(-${theme.spacing.small}px - 100%))`,
    wordBreak: 'break-word',
  },
}))
const TooltipSwatchSC = styled.div.attrs(() => ({
  'aria-hidden': true,
}))<{ $color: string }>(({ $color }) => ({
  width: 12,
  height: 12,
  flexShrink: 0,
  backgroundColor: $color,
}))
const springConfig = {
  mass: 1,
  tension: 105,
  friction: 12,
  precision: 0.01,
}

function TooltipWrapper({
  color,
  tooltipStyles,
  children,
}: {
  color?: string
  tooltipStyles?: CSSProperties
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cursorPos = useCursorPosition()
  const theme = useTheme()

  const springProps = useSpring({
    ...cursorPos,
    config: springConfig,
  })

  const content = (
    <AnimatedDiv
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: theme.zIndexes.tooltip,
        pointerEvents: 'none',
        ...springProps,
      }}
    >
      <TooltipContentSC style={tooltipStyles}>
        {color && <TooltipSwatchSC $color={color} />}
        {children}
      </TooltipContentSC>
    </AnimatedDiv>
  )

  return (
    <TooltipSC ref={ref as any}>
      {createPortal(content, document.body)}
    </TooltipSC>
  )
}

export function ChartTooltip({
  label,
  value,
  ...props
}: {
  label: ReactNode
  value: ReactNode
  color: string
  tooltipStyles?: CSSProperties
}) {
  return (
    <TooltipWrapper {...props}>
      <div>
        {label}: <b>{value}</b>
      </div>
    </TooltipWrapper>
  )
}

const SERIES_TOOLTIP_ROWS = 10

const SeriesRowsSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: theme.spacing.xsmall,
  rowGap: theme.spacing.xxxsmall,
  maxWidth: 360,
}))

/** Every series' value at the hovered time, largest first. */
export function SeriesSliceTooltip({ slice }: SliceTooltipProps<LineSeries>) {
  const points = [...slice.points].sort(
    (a, b) => Number(b.data.y) - Number(a.data.y)
  )
  const hidden = points.length - SERIES_TOOLTIP_ROWS

  return (
    <TooltipWrapper>
      <div>
        {points[0]?.data.xFormatted}
        <SeriesRowsSC>
          {points.slice(0, SERIES_TOOLTIP_ROWS).map((point) => (
            <Fragment key={point.id}>
              <TooltipSwatchSC $color={point.seriesColor} />
              <span>{point.seriesId}</span>
              <b>{point.data.yFormatted}</b>
            </Fragment>
          ))}
        </SeriesRowsSC>
        {hidden > 0 && <div>+{hidden} more</div>}
      </div>
    </TooltipWrapper>
  )
}

export function SliceTooltip({ point }: PointTooltipProps<LineSeries>) {
  const { seriesColor, seriesId, data } = point
  return (
    <TooltipWrapper color={seriesColor}>
      <div>
        {seriesId}: <b>{data.yFormatted}</b>
        <br />
        {data.xFormatted}
      </div>
    </TooltipWrapper>
  )
}
