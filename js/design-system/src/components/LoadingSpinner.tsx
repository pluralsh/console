import {
  type ComponentPropsWithRef,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CSSTransition } from 'react-transition-group'
import styled, { keyframes, useTheme } from 'styled-components'

import { useIsomorphicLayoutEffect } from '@react-spring/web'

import useResizeObserver from '../hooks/useResizeObserver'
import Flex from './Flex'

export type LoadingSpinnerProps = ComponentPropsWithRef<'div'> & {
  paused?: boolean
  show?: boolean
  spinnerWidth?: number
  spinnerDelay?: number
  centered?: boolean
  animateTransitions?: boolean
}

const bgKeyframes = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translate(calc(-200% / 3));
  }
`

const logoEnterStyles = {
  '.enter &': {
    opacity: 0,
    transform: 'scale(0.3)',
  },
  '.enter-active &, .enter-done &': {
    opacity: 1,
    transform: 'scale(1)',
    visibility: 'visible' as const,
  },
  '.enter-active &': {
    transition: 'all 0.3s cubic-bezier(.37,1.4,.62,1)',
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
const CenteringWrapperBase = styled(WrapperBase)<{ areaHeight: any }>`
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

const ScrollingBGImageBase = styled.div<{ $height: number }>(({ $height }) => ({
  background: 'url(/page-load-spinner/page-load-spinner-bg.png)',
  backgroundSize: '100% auto',
  backgroundRepeat: 'repeat-y',
  height: $height,
  width: $height * 6,
  '&:nth-child(2n)': {
    transform: 'rotate(180deg)',
  },
}))

const HiddenLogoSC = styled.img({
  display: 'block',
  width: '100%',
  visibility: 'hidden',
})

const LogoMaskSC = styled.div<{ $width: number }>(({ $width }) => ({
  mask: 'url(/logos/plural-logomark-only-white.svg) 0 0 / contain no-repeat',
  background: 'url(/logos/plural-logomark-only-white.svg)',
  backgroundSize: 'contain',
  overflow: 'hidden',
  width: $width,
  height: 'auto',
  position: 'relative',
  ...logoEnterStyles,
}))

const ScrollingBGImage = styled(ScrollingBGImageBase)`
  @supports (aspect-ratio: 6 / 1) {
    height: 100%;
    width: auto;
    aspect-ratio: 6 / 1;
  }
`

const BgTrackSC = styled.div<{ $paused?: boolean }>`
  display: flex;
  flex-wrap: nowrap;
  height: 100%;
  position: absolute;
  top: 0;
  animation-name: ${bgKeyframes};
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
  animation-duration: 3s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
`

function WrapperBase({ children }: { children: ReactNode }) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      width="auto"
    >
      {children}
    </Flex>
  )
}

function CenteringWrapper({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const [top, setTop] = useState<number | null>(null)
  const [windowHeight, setWindowHeight] = useState<number | null>(
    window.innerHeight
  )
  const ref = useRef<HTMLDivElement>(null)

  const onSizeChange = useCallback(() => {
    const nextTop = ref.current?.getBoundingClientRect().top

    if (nextTop == null) return

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
      css={{
        paddingLeft: theme.spacing.small,
        paddingRight: theme.spacing.small,
      }}
      width="100%"
      height={wrapperHeight}
    >
      <CenteringWrapperBase areaHeight={wrapperHeight}>
        {children}
      </CenteringWrapperBase>
    </Flex>
  )
}

const WrapperSC = styled.div(exitStyles)

function Wrapper({
  ref,
  centered,
  children,
  ...props
}: ComponentPropsWithRef<'div'> & { centered: boolean }) {
  return (
    <WrapperSC
      ref={ref}
      {...props}
    >
      {centered ? (
        <CenteringWrapper>{children}</CenteringWrapper>
      ) : (
        <WrapperBase>{children}</WrapperBase>
      )}
    </WrapperSC>
  )
}

function LoadingSpinner({
  ref,
  show = true,
  paused,
  spinnerWidth = 96,
  spinnerDelay = 200,
  centered = false,
  animateTransitions = true,
  ...props
}: LoadingSpinnerProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
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
      nodeRef={nodeRef}
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
        <LogoMaskSC
          ref={nodeRef}
          $width={spinnerWidth}
        >
          <HiddenLogoSC src="/logos/plural-logomark-only-white.svg" />
          <BgTrackSC $paused={paused}>
            <ScrollingBGImage $height={spinnerWidth} />
            <ScrollingBGImage $height={spinnerWidth} />
            <ScrollingBGImage $height={spinnerWidth} />
          </BgTrackSC>
        </LogoMaskSC>
      </Wrapper>
    </CSSTransition>
  )
}

export default LoadingSpinner
