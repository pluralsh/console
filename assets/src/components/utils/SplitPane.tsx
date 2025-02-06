import { useResizeObserver } from '@pluralsh/design-system'
import { useFitViewAfterLayout } from 'components/cd/pipelines/utils/nodeLayouter'
import usePersistedState from 'components/hooks/usePersistedState'
import {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'

const RESIZER_HEIGHT = 24
const PANE_MIN = 100
const KEY_INC = 10
const SHIFT_MULT = 5

const ResizerSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flex: `0 0 ${RESIZER_HEIGHT}px`,
  height: RESIZER_HEIGHT,
  gap: theme.spacing.small,
  alignItems: 'center',
  width: '100%',
}))
const ResizerVisualHandleSC = styled.div(({ theme }) => ({
  display: 'flex',
  height: 4,
  width: '33.33%',
  maxWidth: 160,
  backgroundColor: theme.colors['text-light'],
  borderRadius: 2,
  transition: 'transform 0.1s ease-out',

  [`${ResizerSC}:has(:focus-visible) &`]: {
    outline: `1px solid ${theme.colors['border-outline-focused']}`,
    outlineOffset: 1,
  },
  [`${ResizerSC}:has(${ResizerFunctionalHandleSC}:hover) &`]: {
    transform: 'scale(1.03)',
    transition: 'transform 0.1s ease-in',
  },
}))
const ResizerDividerSC = styled.div(({ theme }) => ({
  display: 'flex',
  height: 1,
  width: '100%',
  backgroundColor: theme.colors.border,
}))
const ResizerFunctionalHandleSC = styled.div((_) => ({
  position: 'absolute',
  top: 4,
  left: 0,
  right: 0,
  bottom: 4,
  cursor: 'row-resize',
  '&:focus-visible': {
    outline: 'none',
  },
}))

// role=separator and aria-orientation=horizontal and tabindex=0
function Resizer(props: ComponentProps<typeof ResizerFunctionalHandleSC>) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <ResizerSC ref={ref}>
      <ResizerDividerSC />
      <ResizerVisualHandleSC />
      <ResizerDividerSC />
      <ResizerFunctionalHandleSC
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        {...props}
      />
    </ResizerSC>
  )
}

const SplitPaneSC = styled.div((_) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}))
const PaneSC = styled.div((_) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
}))
const Pane1SC = styled(PaneSC)((_) => ({
  flexShrink: 0,
}))
const Pane2SC = styled(PaneSC)((_) => ({}))

export function SplitPane({
  id,
  pane1,
  pane2,
  ...props
}: {
  id: string
  pane1: ReactNode
  pane2: ReactNode
} & ComponentPropsWithoutRef<typeof SplitPaneSC>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [boxTop, setBoxTop] = useState(0)
  const [boxHeight, setBoxHeight] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [split, setSplit] = usePersistedState(
    `split-pane-amt-${id}`,
    0.5,
    (val) => (typeof val === 'number' ? Math.min(1, Math.max(0, val)) : 0.5)
  )

  useFitViewAfterLayout()

  useResizeObserver(
    wrapperRef,
    useCallback((rect) => {
      setBoxHeight(rect.height)
    }, [])
  )
  useEffect(() => {
    const updateTop = () => {
      setBoxTop((pT) => wrapperRef.current?.getBoundingClientRect().top || pT)
    }

    setBoxTop((pT) => wrapperRef.current?.getBoundingClientRect().top || pT)
    window.addEventListener('resize', updateTop)

    updateTop()

    return window.removeEventListener('resize', updateTop)
  }, [])

  useEffect(() => {
    const listener = (e) => {
      const nextSplit = Math.min(
        1,
        Math.max(0, (e.clientY - boxTop) / boxHeight)
      )

      setSplit(nextSplit)
    }

    if (dragging) {
      window.addEventListener('mousemove', listener)
      window.addEventListener('mouseup', () => setDragging(false))

      return () => window.removeEventListener('mousemove', listener)
    }
  }, [dragging, boxTop, boxHeight, setSplit])
  const pane1Height =
    Math.min(
      Math.max(PANE_MIN + RESIZER_HEIGHT * 0.5, split * boxHeight),
      boxHeight - (PANE_MIN + RESIZER_HEIGHT * 0.5)
    ) -
    RESIZER_HEIGHT * 0.5

  return (
    <SplitPaneSC
      {...props}
      ref={wrapperRef}
    >
      <Pane1SC style={{ height: pane1Height }}>{pane1}</Pane1SC>
      <Resizer
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            setSplit((prev) =>
              Math.min(
                (prev * boxHeight + KEY_INC * (e.shiftKey ? SHIFT_MULT : 1)) /
                  boxHeight,
                1
              )
            )
          } else if (e.key === 'ArrowUp') {
            setSplit((prev) =>
              Math.max(
                (prev * boxHeight - KEY_INC * (e.shiftKey ? SHIFT_MULT : 1)) /
                  boxHeight,
                0
              )
            )
          }
        }}
      />
      <Pane2SC>{pane2}</Pane2SC>
    </SplitPaneSC>
  )
}
