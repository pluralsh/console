import type { ReactNode } from 'react'
import styled from 'styled-components'

import GraphHeader from 'components/utils/GraphHeader'
import { MetricsCard } from './MetricsCard'

export const METRICS_GRAPH_HEIGHT = 340

/** A single titled graph in its own hairline card. */
export function MetricsGraphCard({
  title,
  tooltip,
  height = METRICS_GRAPH_HEIGHT,
  children,
}: {
  title: string
  tooltip?: string
  height?: number | 'auto'
  children: ReactNode
}) {
  return (
    <GraphCardSC style={{ height }}>
      <GraphHeader
        title={title}
        tooltip={tooltip}
      />
      <div css={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
        {children}
      </div>
    </GraphCardSC>
  )
}

const MIN_GRAPH_WIDTH = 420

// two columns at most, collapsing to one when two can't fit MIN_GRAPH_WIDTH each
export const MetricsGraphGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.medium,
  gridTemplateColumns: `repeat(auto-fill, minmax(max(${MIN_GRAPH_WIDTH}px, calc((100% - ${theme.spacing.medium}px) / 2)), 1fr))`,
}))

/** Scroll container for a metrics dashboard below its fixed time range control. */
export const MetricsScrollSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  overflowY: 'auto',
  paddingBottom: theme.spacing.large,
}))

const GraphCardSC = styled(MetricsCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
}))
