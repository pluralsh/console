import { Div, type DivProps, Flex } from 'honorable'
import {
  Children,
  type ReactElement,
  type Ref,
  forwardRef,
  useEffect,
  useState,
} from 'react'
import { CSSTransition } from 'react-transition-group'
import { keyframes } from '@emotion/react'
import PropTypes from 'prop-types'

type DotProps = DivProps & {
  active?: boolean
  size?: number
}

export type CarouselProps = DivProps & {
  autoAdvanceTime?: number
}

const propTypes = {
  autoAdvanceTime: PropTypes.number,
}

const dotAnimationIn = keyframes`
0% {
  transform: scale(1)
}
50% {
  transform: scale(1.15)
}
100% {
  transform: scale(1)
}
`

function Dot({ active = false, size = 8, ...props }: DotProps) {
  return (
    <Div
      padding="xxsmall"
      cursor="pointer"
      {...props}
    >
      <Div
        backgroundColor={active ? 'action-link-inline' : 'fill-two'}
        transition="background-color 0.35s cubic-bezier(.20,.55,.80,.45)"
        animationName={active ? dotAnimationIn : null}
        animationDuration="0.75s"
        animationIterationCount="1"
        width={size}
        height={size}
        borderRadius="50%"
      />
    </Div>
  )
}

const transitionStyles = {
  opacity: 0,
  visibility: 'hidden',
  '&.appear, &.appear-active, &.appear-done': {
    opacity: 1,
    transform: 'translateY(0)',
    visibility: 'visible',
  },
  '&.enter': {
    visibility: 'visible',
    transform: 'scale(1.2)',
    filter: 'blur(10px)',
  },
  '&.enter-active': {
    transition: 'all 1.2s ease',
    transitionDelay: '0.3s',
    filter: 'blur(0)',
  },
  '&.enter-active,&.enter-done': {
    visibility: 'visible',
    transform: 'scale(1)',
    opacity: 1,
  },
  '&.exit': {
    transform: 'translateY(0)',
    opacity: 1,
    visibility: 'visible',
  },
  '&.exit-active': {
    transition: 'all 1.2s ease',
  },
  '&.exit-active, &.exit-done': {
    transform: ' scale(0.75)',
    opacity: 0,
    filter: 'blur(5px)',
  },
  '&.exit-done': {
    visibility: 'hidden',
  },
}

function CarouselRef(
  { autoAdvanceTime = 10000, children, ...props }: CarouselProps,
  ref: Ref<any>
) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (autoAdvanceTime <= 0) return

    const timer = setTimeout(() => {
      setActiveIndex(
        activeIndex >= Children.count(children) - 1 ? 0 : activeIndex + 1
      )
    }, autoAdvanceTime)

    return () => {
      clearTimeout(timer)
    }
  }, [activeIndex, autoAdvanceTime, children])

  return (
    <Div
      ref={ref}
      backgroundColor="fill-one"
      border="1px solid border"
      borderRadius="medium"
      {...props}
    >
      <Flex overflow="hidden">
        {Children.map(children, (child: ReactElement, i: number) => (
          <Flex
            width="100%"
            flexShrink={0}
            justify="center"
            alignItems="stretch"
            transform={`translateX(${-i * 100}%)`}
            pointerEvents={activeIndex === i ? 'auto' : 'none'}
          >
            <CSSTransition
              in={activeIndex === i}
              appear
              timeout={2000}
            >
              <Flex
                width="100%"
                alignItems="center"
                {...transitionStyles}
              >
                {child}
              </Flex>
            </CSSTransition>
          </Flex>
        ))}
      </Flex>
      <Flex
        marginTop="xsmall"
        marginBottom="medium"
        justifyContent="center"
      >
        {Children.map(children, (_child: ReactElement, i: number) => (
          <Dot
            active={activeIndex === i}
            onClick={() => {
              setActiveIndex(i)
            }}
          />
        ))}
      </Flex>
    </Div>
  )
}

const Carousel = forwardRef(CarouselRef)

Carousel.propTypes = propTypes

export default Carousel
