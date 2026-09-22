import {
  Code,
  Flyover,
  HamburgerMenuCollapseIcon,
  IconFrame,
  useResizeObserver,
} from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { clamp } from 'lodash'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'

const DOCK_MIN_WIDTH = 360
const DOCK_MAX_WIDTH_VW = 55
const DOCK_DEFAULT_WIDTH = 480
const OVERLAY_BREAKPOINT = 960
const HANDLE_THICKNESS = 20
const STORAGE_KEY = 'workbench-monitoring-definition-panel-width'

export function WorkbenchMonitoringDefinitionPanel({
  open,
  onClose,
  yaml,
  containerRef,
}: {
  open: boolean
  onClose: () => void
  yaml: string
  containerRef: RefObject<HTMLElement | null>
}) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  useResizeObserver(containerRef, (rect) => setContainerWidth(rect.width))
  useEffect(() => {
    const el = containerRef.current
    if (el) setContainerWidth(el.getBoundingClientRect().width)
  }, [containerRef])

  const docked =
    containerWidth == null ? true : containerWidth >= OVERLAY_BREAKPOINT
  const { panelWidth, dragHandleProps, isDragging } = useDefinitionPanelWidth()

  useEffect(() => {
    if (!open || !docked) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, docked, onClose])

  if (!open) return null

  const body = (
    <DefinitionPanelBody
      yaml={yaml}
      onClose={onClose}
    />
  )

  if (!docked) {
    return (
      <Flyover
        open={open}
        onClose={onClose}
        width="min(560px, 100%)"
        minWidth={320}
        scrollable={false}
        css={{ padding: 0, display: 'flex', flexDirection: 'column' }}
      >
        {body}
      </Flyover>
    )
  }

  return (
    <DockedSC style={{ width: panelWidth }}>
      <DragHandleSC
        tabIndex={0}
        $isDragging={isDragging}
        {...dragHandleProps}
      />
      {body}
    </DockedSC>
  )
}

function DefinitionPanelBody({
  yaml,
  onClose,
}: {
  yaml: string
  onClose: () => void
}) {
  return (
    <BodySC>
      <HeaderSC>
        <EyebrowSC>Definition</EyebrowSC>
        <IconFrame
          clickable
          size="medium"
          type="tertiary"
          icon={<HamburgerMenuCollapseIcon />}
          textValue="Close definition"
          onClick={onClose}
        />
      </HeaderSC>
      <CodeWrapSC>
        <DefinitionCode yaml={yaml} />
      </CodeWrapSC>
    </BodySC>
  )
}

function DefinitionCode({ yaml }: { yaml: string }) {
  return (
    <Code
      language="yaml"
      showHeader={false}
      showLineNumbers
      css={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        border: 'none',
        borderRadius: 0,
      }}
    >
      {yaml}
    </Code>
  )
}

function useDefinitionPanelWidth() {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 })
  const [panelWidth, setPanelWidthState] = usePersistedState(
    STORAGE_KEY,
    DOCK_DEFAULT_WIDTH,
    1000
  )

  const setPanelWidth = useCallback(
    (next: number) => {
      setPanelWidthState(
        clamp(
          next,
          DOCK_MIN_WIDTH,
          Math.max(
            DOCK_MIN_WIDTH,
            window.innerWidth * (DOCK_MAX_WIDTH_VW / 100)
          )
        )
      )
    },
    [setPanelWidthState]
  )

  useResizeObserver({ current: document.body }, () => setPanelWidth(panelWidth))

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, width: panelWidth })
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) setPanelWidth(dragStart.width + (dragStart.x - e.clientX))
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      setPanelWidth(panelWidth + (e.key === 'ArrowLeft' ? 10 : -10))
    }
  }

  return {
    panelWidth,
    isDragging,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onKeyDown: handleKeyDown,
    },
  }
}

export function DefinitionPanelShell({
  children,
  panel,
  containerRef,
}: {
  children: ReactNode
  panel: ReactNode
  containerRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <ShellSC ref={containerRef}>
      {children}
      {panel}
    </ShellSC>
  )
}

export function useDefinitionPanelContainer() {
  return useRef<HTMLDivElement>(null)
}

const ShellSC = styled.div({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const DockedSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  borderLeft: theme.borders.default,
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: '100%',
  minWidth: DOCK_MIN_WIDTH,
  position: 'relative',
  zIndex: 1,
}))

const BodySC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const HeaderSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one'],
  borderBottom: theme.borders.default,
  borderTop: theme.borders.default,
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  height: 40,
  justifyContent: 'space-between',
  paddingLeft: theme.spacing.medium,
  paddingRight: theme.spacing.xsmall,
}))

const EyebrowSC = styled.p(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  margin: 0,
}))

const CodeWrapSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
}))

const DragHandleSC = styled.div<{ $isDragging?: boolean }>(
  ({ theme, $isDragging }) => ({
    background: 'transparent',
    cursor: 'ew-resize',
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    left: -HANDLE_THICKNESS / 2,
    position: 'absolute',
    top: 0,
    width: HANDLE_THICKNESS,
    zIndex: 2,
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
    '&::before': {
      background: theme.colors['icon-primary'],
      content: $isDragging ? '""' : 'none',
      height: '100%',
      pointerEvents: 'none',
      width: HANDLE_THICKNESS / 4,
    },
  })
)
