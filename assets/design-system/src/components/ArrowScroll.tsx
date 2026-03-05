import { ComponentPropsWithRef, ReactNode, useRef, useState } from 'react'
import styled from 'styled-components'

import { SemanticColorKey } from 'src/theme/colors'
import useResizeObserver from '../hooks/useResizeObserver'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'

function ArrowScroll({
  children,
  showArrow = true,
  color = 'fill-one-selected',
  ...props
}: {
  children?: ReactNode
  showArrow?: boolean
  color?: SemanticColorKey
} & ComponentPropsWithRef<'div'>) {
  const containerRef = useRef<HTMLDivElement>(undefined)
  const [showLeftGradient, setShowLeftGradient] = useState(false)
  const [showRightGradient, setShowRightGradient] = useState(false)

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current

      setShowLeftGradient(scrollLeft > 0)
      setShowRightGradient(Math.ceil(scrollLeft + clientWidth) < scrollWidth)
    }
  }

  useResizeObserver(containerRef, checkScroll)

  return (
    <WrapperSC {...props}>
      <ArrowWrapperSC
        onClick={() =>
          containerRef.current?.scrollBy({ left: -100, behavior: 'smooth' })
        }
        $direction="left"
        $hasArrow={showArrow}
        $color={color}
        $visible={showLeftGradient}
      >
        {showArrow ? <ArrowLeftIcon size={8} /> : null}
      </ArrowWrapperSC>
      <ArrowWrapperSC
        onClick={() =>
          containerRef.current?.scrollBy({ left: 100, behavior: 'smooth' })
        }
        $direction="right"
        $hasArrow={showArrow}
        $color={color}
        $visible={showRightGradient}
      >
        {showArrow ? <ArrowRightIcon size={8} /> : null}
      </ArrowWrapperSC>
      <ScrollAreaSC
        ref={containerRef}
        onScroll={checkScroll}
      >
        {children}
      </ScrollAreaSC>
    </WrapperSC>
  )
}

const WrapperSC = styled.div({
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
  minHeight: 'fit-content',
})

const ScrollAreaSC = styled.div({
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none', // Firefox
  msOverflowStyle: 'none', // Edge
  '&::-webkit-scrollbar': {
    display: 'none', // Chrome, Safari, Opera
  },
})

const ArrowWrapperSC = styled.div<{
  $direction: 'left' | 'right'
  $color: SemanticColorKey
  $hasArrow: boolean
  $visible: boolean
}>(({ theme, $direction, $color, $hasArrow, $visible }) => ({
  color: theme.colors['icon-light'],
  zIndex: theme.zIndexes.modal - 1,
  position: 'absolute',
  top: 0,
  bottom: 0,
  ...{ [$direction]: 0 },
  width: 36,
  display: 'flex',
  justifyContent: $direction === 'left' ? 'flex-start' : 'flex-end',
  padding: `0 ${theme.spacing.xxsmall}px`,
  alignItems: 'center',
  transition: 'opacity .2s ease',
  background: `linear-gradient(to ${$direction}, transparent 0%, ${theme.colors[$color]} 70%, ${theme.colors[$color]} 100%)`,
  opacity: $visible ? 1 : 0,
  cursor: $visible && $hasArrow ? 'pointer' : 'default',
  pointerEvents: $visible && $hasArrow ? 'auto' : 'none',
}))

export default ArrowScroll
