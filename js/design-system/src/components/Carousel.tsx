import Flex from './Flex'
import {
  Children,
  type ComponentPropsWithRef,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react'
import { CSSTransition } from 'react-transition-group'
import styled, { keyframes } from 'styled-components'

export type CarouselProps = ComponentPropsWithRef<typeof CarouselSC> & {
  autoAdvanceTime?: number
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

const CarouselSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
}))

const DotHitAreaSC = styled.div(({ theme }) => ({
  padding: theme.spacing.xxsmall,
  cursor: 'pointer',
}))

const DotSC = styled.div<{ $active: boolean; $size: number }>`
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors['action-link-inline'] : theme.colors['fill-two']};
  transition: background-color 0.35s cubic-bezier(0.2, 0.55, 0.8, 0.45);
  animation-duration: 0.75s;
  animation-iteration-count: 1;
  animation-name: ${({ $active }) => ($active ? dotAnimationIn : 'none')};
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
`

function Dot({
  active = false,
  size = 8,
  ...props
}: ComponentPropsWithRef<'div'> & {
  active?: boolean
  size?: number
}) {
  return (
    <DotHitAreaSC {...props}>
      <DotSC
        $active={active}
        $size={size}
      />
    </DotHitAreaSC>
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
} as const

function CarouselSlide({
  active,
  children,
}: {
  active: boolean
  children: ReactElement
}) {
  const nodeRef = useRef<HTMLDivElement>(null)

  return (
    <CSSTransition
      in={active}
      appear
      timeout={2000}
      nodeRef={nodeRef}
    >
      <Flex
        ref={nodeRef}
        width="100%"
        alignItems="center"
        css={transitionStyles}
      >
        {children}
      </Flex>
    </CSSTransition>
  )
}

function Carousel({
  autoAdvanceTime = 10000,
  children,
  ...props
}: CarouselProps) {
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
    <CarouselSC {...props}>
      <Flex overflow="hidden">
        {Children.toArray(children).map((child, i) => (
          <Flex
            key={i}
            width="100%"
            flexShrink={0}
            justify="center"
            alignItems="stretch"
            css={{
              transform: `translateX(${-i * 100}%)`,
              pointerEvents: activeIndex === i ? 'auto' : 'none',
            }}
          >
            <CarouselSlide active={activeIndex === i}>
              {child as ReactElement}
            </CarouselSlide>
          </Flex>
        ))}
      </Flex>
      <Flex
        marginTop="xsmall"
        marginBottom="medium"
        justify="center"
      >
        {Children.toArray(children).map((_child, i) => (
          <Dot
            key={i}
            active={activeIndex === i}
            onClick={() => {
              setActiveIndex(i)
            }}
          />
        ))}
      </Flex>
    </CarouselSC>
  )
}

export default Carousel
