import {
  Children,
  type ComponentProps,
  cloneElement,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'

import useResizeObserver from '../hooks/useResizeObserver'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'

const ComponentWrapperSC = styled.div({
  position: 'relative',
  overflowX: 'auto',
  '& > *': {
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // Edge
    '&::-webkit-scrollbar': {
      display: 'none', // Chrome, Safari, Opera
    },
  },
})
const ArrowWrapperSC = styled.div<{
  $direction?: 'left' | 'right'
}>(({ theme, $direction }) => ({
  color: theme.colors['icon-light'],
  zIndex: theme.zIndexes.modal - 1,
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: '36px',
  display: 'flex',
  justifyContent: $direction === 'left' ? 'flex-start' : 'flex-end',
  padding: `0 ${theme.spacing.xxsmall}px`,
  alignItems: 'center',
  transition: 'opacity .2s ease',
  background: `linear-gradient(${
    $direction === 'left' ? 'to left' : 'to right'
  }, transparent 0%, ${theme.colors['fill-one-selected']} 70%, ${
    theme.colors['fill-one-selected']
  } 100%)`,
  ...($direction === 'left' ? { left: 0 } : { right: 0 }),
  '&.visible': {
    cursor: 'pointer',
    opacity: 1,
  },
  '&.hidden': {
    opacity: 0,
    pointerEvents: 'none',
  },
}))

function Arrow({
  direction,
  show,
  ...props
}: {
  direction: 'left' | 'right'
  show: boolean
} & ComponentProps<typeof ArrowWrapperSC>) {
  const Icon = direction === 'left' ? ArrowLeftIcon : ArrowRightIcon

  return (
    <ArrowWrapperSC
      $direction={direction}
      className={show ? 'visible' : 'hidden'}
      {...props}
    >
      <Icon size={8} />
    </ArrowWrapperSC>
  )
}

const scroll = (
  element: HTMLElement | null | undefined,
  direction: 'left' | 'right'
) => {
  if (element) {
    element.scrollBy({
      left: direction === 'left' ? -100 : 100,
      behavior: 'smooth',
    })
  }
}

function ArrowScroll({ children, ...props }: { children?: any }) {
  const containerRef = useRef<HTMLElement>(undefined)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current

      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth)
    }
  }

  useResizeObserver(containerRef, checkScroll)

  return (
    <ComponentWrapperSC {...props}>
      <Arrow
        onClick={() => scroll(containerRef.current, 'left')}
        direction="left"
        show={showLeftArrow}
      />
      <Arrow
        onClick={() => scroll(containerRef.current, 'right')}
        direction="right"
        show={showRightArrow}
      />
      {cloneElement(Children.only(children), {
        onScroll: checkScroll,
        ref: (node: HTMLElement) => {
          containerRef.current = node
          if (children.ref) {
            if (typeof children.ref === 'function') {
              children.ref(node)
            } else if (children.ref) {
              children.ref.current = node
            }
          }
        },
      })}
    </ComponentWrapperSC>
  )
}

export default ArrowScroll
