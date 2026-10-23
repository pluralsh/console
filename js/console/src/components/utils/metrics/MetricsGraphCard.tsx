import {
  CloseIcon,
  ExpandIcon,
  IconFrame,
  ModalWrapper,
} from '@pluralsh/design-system'
import { type ReactNode, useRef, useState } from 'react'
import styled from 'styled-components'

import GraphHeader from 'components/utils/GraphHeader'
import { CaptionP } from 'components/utils/typography/Text'
import { MetricsCard } from './MetricsCard'

export const METRICS_GRAPH_HEIGHT = 340

/** A single titled graph in its own hairline card, expandable to a full screen modal. */
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
  const [fullscreen, setFullscreen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <GraphCardSC style={{ height }}>
        <GraphHeader
          title={title}
          tooltip={tooltip}
          actions={
            <IconFrame
              ref={triggerRef}
              clickable
              size="small"
              type="tertiary"
              icon={<ExpandIcon size={16} />}
              textValue="Full screen"
              tooltip="Full screen"
              onClick={() => setFullscreen(true)}
            />
          }
        />
        <GraphBodySC>{children}</GraphBodySC>
      </GraphCardSC>
      <ModalWrapper
        open={fullscreen}
        onOpenChange={setFullscreen}
        title={title}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          requestAnimationFrame(() => triggerRef.current?.focus())
        }}
        css={{
          height: 'min(900px, 100%)',
          maxHeight: '100%',
          overflow: 'hidden',
          width: 'min(1500px, 100%)',
        }}
      >
        {fullscreen && (
          <FullscreenCardSC>
            <div>
              <GraphHeader
                title={title}
                actions={
                  <IconFrame
                    clickable
                    size="small"
                    type="tertiary"
                    icon={<CloseIcon />}
                    textValue="Close full screen"
                    tooltip="Close full screen"
                    onClick={() => setFullscreen(false)}
                  />
                }
              />
              {tooltip && <CaptionP $color="text-xlight">{tooltip}</CaptionP>}
            </div>
            <GraphBodySC>{children}</GraphBodySC>
          </FullscreenCardSC>
        )}
      </ModalWrapper>
    </>
  )
}

const MIN_GRAPH_WIDTH = 420

// two columns at most, collapsing to one when two can't fit MIN_GRAPH_WIDTH each
export const MetricsGraphGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.medium,
  gridTemplateColumns: `repeat(auto-fill, minmax(max(${MIN_GRAPH_WIDTH}px, calc((100% - ${theme.spacing.medium}) / 2)), 1fr))`,
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
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
}))

const FullscreenCardSC = styled(MetricsCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  padding: theme.spacing.large,
  width: '100%',
}))

const GraphBodySC = styled.div({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
})
