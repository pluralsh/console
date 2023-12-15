import {
  Div,
  type DivProps,
  Flex,
  type FlexProps,
  H1,
  Img,
  type ImgProps,
  Span,
} from 'honorable'
import { keyframes } from '@emotion/react'
import styled from 'styled-components'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CSSTransition } from 'react-transition-group'

import { useIsomorphicLayoutEffect } from '@react-spring/web'

import useResizeObserver from '../hooks/useResizeObserver'

export type LoadingSpinnerProps = DivProps & {
  paused?: boolean
  show?: boolean
  spinnerWidth?: number
  spinnerDelay?: number
  centered?: boolean
  animateTransitions?: boolean
}

type ScrollingBGImageProps = ImgProps & { height: number }

const bgKeyframes = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translate(calc(-200% / 3));
  }
`

const commonAnimStyles = {
  animationDuration: '3s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
}

const logoEnterStyles = {
  '.enter &': {
    opacity: 0,
    transform: 'scale(0.3)',
  },
  '.enter-active &, .enter-done &': {
    opacity: 1,
    transform: 'scale(1)',
    visibility: 'visible',
  },
  '.enter-active &': {
    transition: 'all 0.3s cubic-bezier(.37,1.4,.62,1)',
  },
}

const textEnterStyles = {
  '.enter &': {
    opacity: 0,
  },
  '.enter-active &, .enter-done &': {
    opacity: 1,
  },
  '.enter-active &': {
    transition: 'all 0.3s ease',
  },
}

const exitStyles = {
  '&.exit': {
    opacity: 1,
  },
  '&.exit-active, &.exit-done': {
    opacity: 0,
  },
  '&.exit-active': {
    transition: 'all 0.1s ease-in',
  },
}

/*
    A bunch of nasty calcs to get the spinner optically centered across
    different viewport heights. Once the vh goes beyond --clampMin, the
    spinner gets shifted up proportional to vh until it reaches --clampMax.
    Units are kinda weird because calc() won't allow a value with units
    as a denominator.
*/
const CenteringWrapperBase = styled(WrapperBase)`
  --clampMin: 250;
  --clampMax: 1000;
  --initialShift: 7px;
  --shiftMultiplier: -13;
  --shiftRatio: calc(
    (${({ areaHeight }: any) => areaHeight} - (var(--clampMin) * 1px)) /
      (var(--clampMax) - var(--clampMin))
  );
  --clampedShiftRatio: calc(max(0px, min(1px, var(--shiftRatio))));
  --translateAmt: calc(
    (var(--initialShift) + (var(--shiftMultiplier) * var(--clampedShiftRatio)))
  );
  transform: translateY(var(--translateAmt));
`

function ScrollingBGImageBase({ height, ...props }: ScrollingBGImageProps) {
  const styles = {
    background: 'url(/page-load-spinner/page-load-spinner-bg.png)',
    backgroundSize: '100% auto',
    backgroundRepeat: 'repeat-y',
    height,
    width: height * 6,
    ':nth-child(2n)': {
      transform: 'rotate(180deg)',
    },
  }

  return (
    <Div
      {...styles}
      {...props}
    />
  )
}

const ScrollingBGImage = styled(ScrollingBGImageBase)`
  @supports (aspect-ratio: 6 / 1) {
    height: 100%;
    width: auto;
    aspect-ratio: 6 / 1;
  }
`

function WrapperBase(props: FlexProps) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      width="auto"
      {...props}
    />
  )
}

function CenteringWrapper({ children, ...props }: FlexProps) {
  const [top, setTop] = useState<number | null>(null)
  const [windowHeight, setWindowHeight] = useState<number | null>(
    window.innerHeight
  )
  const ref = useRef<HTMLDivElement>()

  const onSizeChange = useCallback(() => {
    const nextTop = ref.current.getBoundingClientRect().top

    if (nextTop !== top) {
      setTop(nextTop)
    }
    if (window.innerHeight !== windowHeight) {
      setWindowHeight(window.innerHeight - nextTop)
    }
  }, [top, windowHeight])

  useResizeObserver(ref, onSizeChange)
  useIsomorphicLayoutEffect(() => {
    window.addEventListener('resize', onSizeChange)
    window.addEventListener('scroll', onSizeChange)

    return () => {
      window.removeEventListener('resize', onSizeChange)
      window.removeEventListener('scroll', onSizeChange)
    }
  })

  const wrapperHeight = useMemo(
    () =>
      `${
        top === null || windowHeight === null ? '100vh' : windowHeight - top
      }px`,
    [top, windowHeight]
  )

  return (
    <Flex
      position="absolute"
      className="centering"
      ref={ref}
      direction="column"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      paddingHorizontal="small"
      width="100%"
      height={wrapperHeight}
      {...props}
    >
      <CenteringWrapperBase areaHeight={wrapperHeight}>
        {children}
      </CenteringWrapperBase>
    </Flex>
  )
}

const Wrapper = forwardRef<HTMLDivElement, DivProps & { centered: boolean }>(
  ({ centered, children, ...props }, ref) => (
    <Div
      ref={ref}
      {...exitStyles}
      {...props}
    >
      {centered ? (
        <CenteringWrapper>{children}</CenteringWrapper>
      ) : (
        <WrapperBase>{children}</WrapperBase>
      )}
    </Div>
  )
)

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      show = true,
      paused,
      spinnerWidth = 96,
      spinnerDelay = 200,
      centered = false,
      animateTransitions = true,
      ...props
    },
    ref
  ) => {
    const [delayFinished, setDelayFinished] = useState(false)
    const [tickCount, setTickCount] = useState(0)

    if (!show && delayFinished) {
      setDelayFinished(false)
    }

    useEffect(() => {
      if (show) {
        const timeoutId = setTimeout(() => {
          setDelayFinished(true)
        }, spinnerDelay)

        return () => {
          clearTimeout(timeoutId)
        }
      }
    }, [show, spinnerDelay])

    useEffect(() => {
      const interval = setTimeout(() => {
        setTickCount(tickCount >= 4 ? 0 : tickCount + 1)
      }, 200)

      return () => clearTimeout(interval)
    }, [tickCount])

    return (
      <CSSTransition
        in={delayFinished && show}
        appear
        timeout={animateTransitions ? 400 : 0}
        unmountOnExit
      >
        <Wrapper
          ref={ref}
          centered={centered}
          className="wrapper"
          {...props}
        >
          <Div
            mask="url(/logos/plural-logomark-only-white.svg) 0 0 / contain no-repeat"
            background="url(/logos/plural-logomark-only-white.svg)"
            backgroundSize="contain"
            overflow="hidden"
            width={spinnerWidth}
            height="auto"
            position="relative"
            {...logoEnterStyles}
          >
            <Img
              display="block"
              width="100%"
              visibility="hidden"
              src="/logos/plural-logomark-only-white.svg"
            />
            <Flex
              flexWrap="nowrap"
              height="100%"
              position="absolute"
              top="0"
              animationName={bgKeyframes}
              animationPlayState={paused ? 'paused' : 'running'}
              {...commonAnimStyles}
            >
              <ScrollingBGImage height={spinnerWidth} />
              <ScrollingBGImage height={spinnerWidth} />
              <ScrollingBGImage height={spinnerWidth} />
            </Flex>
          </Div>
          <H1
            body1
            bold
            color="text"
            marginTop="large"
            textAlign="center"
            {...textEnterStyles}
          >
            Loading Plural
            <Span opacity={tickCount >= 1 ? 1 : 0}>.</Span>
            <Span opacity={tickCount >= 2 ? 1 : 0}>.</Span>
            <Span opacity={tickCount >= 3 ? 1 : 0}>.</Span>
          </H1>
        </Wrapper>
      </CSSTransition>
    )
  }
)

export default LoadingSpinner
