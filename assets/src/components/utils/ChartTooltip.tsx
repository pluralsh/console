import { AnimatedDiv, Card } from '@pluralsh/design-system'
import { useSpring } from '@react-spring/web'
import { CSSProperties, ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled, { useTheme } from 'styled-components'

import { useCursorPosition } from './CursorPosition'
import { LineSeries, PointTooltipProps } from '@nivo/line'

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
  color: string
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
        <TooltipSwatchSC $color={color} />
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
