import { Div, DivProps, Flex } from 'honorable'
import { Children, useEffect, useState } from 'react'
import { CSSTransition } from 'react-transition-group'
import { keyframes } from '@emotion/react'

export type CarouselProps = DivProps & {
  autoAdvanceTime?: number
} 

const dotAnimationIn = keyframes`
0% {
  transform: scale(1,1)
}
50% {
  transform: scale(1.15, 1.15)
}
100% {
  transform: scale(1, 1)
}
`

function Dot({ active = false, ...props }: DivProps & { active?: boolean }) {
  return (
    <Div
      padding="4px"
      cursor="pointer"
      {...props}
    >
      <Div
        backgroundColor={active ? 'action-link-inline' : 'fill-two'}
        transition="background-color 0.35s cubic-bezier(.20,.55,.80,.45)"
        animationName={active ? dotAnimationIn : null}
        animationDuration="0.75s"
        animationIterationCount="1"
        width="8px"
        height="8px"
        borderRadius="4px"
      />
    </Div>
  )
}

const transitionStyles = {
  opacity: '0',
  visibility: 'hidden',
  '&.appear, &.appear-active, &.appear-done': {
    opacity: '1',
    transform: 'translateY(0)',
    visibility: 'visible',
  },
  '&.enter': {
    visibility: 'visible',
    transform: 'scale(1.2, 1.2)',
    filter: 'blur(10px)',
  },
  '&.enter-active': {
    transition: 'all 1.2s ease',
    transitionDelay: '0.3s',
    filter: 'blur(0)',
  },
  '&.enter-active,&.enter-done': {
    visibility: 'visible',
    transform: 'scale(1, 1)',
    opacity: '1',
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
    transform: ' scale(0.75, 0.75)',
    opacity: '0',
    filter: 'blur(5px)',
  },
  '&.exit-done': {
    visibility: 'hidden',
  },
}

export default function Carousel({ autoAdvanceTime = 10000, children, ...props }: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    if (autoAdvanceTime > 0) {
      const timer = setTimeout(() => {
        if (activeIndex >= Children.count(children) - 1) {
          setActiveIndex(0)
        }
        else {
          setActiveIndex(activeIndex + 1)
        }
      }, autoAdvanceTime)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [activeIndex, autoAdvanceTime, children])

  return (
    <Div
      {...props}
      backgroundColor="fill-one"
      border="1px solid border"
      borderRadius="normal"
    >
      <Flex
        overflow="hidden"
        alignItems="stretch"
      >
        {Children.map(children, (child: any, i: any) => (
          <Flex
            width="100%"
            flexShrink="0"
            textAlign="center"
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
                className="stretched"
                alignItems="center"
                {...transitionStyles}
              >
                {child}
              </Flex>
            </CSSTransition>
          </Flex>
        )
        )}
      </Flex>
      <Flex
        mt="8px"
        mb="16px"
        justifyContent="center"
      >
        {Children.map(children, (child: any, i: any) => (
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
