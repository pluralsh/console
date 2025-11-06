import {
  ComponentPropsWithRef,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import styled from 'styled-components'

type Position = { x: number; y: number }

export function PanZoomWrapper({
  children,
  minZoom = 0.1,
  maxZoom = 5,
  zoomSpeed = 0.0025,
  actionButtons,
  ...props
}: {
  children?: ReactNode
  minZoom?: number
  maxZoom?: number
  zoomSpeed?: number
  actionButtons?: ReactNode
} & ComponentPropsWithRef<'div'>) {
  const [scale, setScale] = useState(1)
  const [{ x, y }, setPosition] = useState<Position>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { isDragging, handleMouseDown } = useGlobalPan(setPosition)

  // native wheel listener with passive: false allows preventDefault to work, so we can avoid scrolling the page
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()

      const newScale = Math.min(
        Math.max(scale - e.deltaY * zoomSpeed, minZoom),
        maxZoom
      )
      const { left, top } = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - left
      const mouseY = e.clientY - top
      const scaleChange = newScale / scale

      setScale(newScale)
      setPosition({
        x: mouseX - (mouseX - x) * scaleChange,
        y: mouseY - (mouseY - y) * scaleChange,
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [scale, x, y, minZoom, maxZoom, zoomSpeed])

  return (
    <ContainerSC
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        '--pan-x': `${x}px`,
        '--pan-y': `${y}px`,
        '--zoom-scale': scale,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      {...props}
    >
      {actionButtons && <ActionButtonsSC>{actionButtons}</ActionButtonsSC>}
      <div
        css={{
          transform:
            'translate(var(--pan-x), var(--pan-y)) scale(var(--zoom-scale))',
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </ContainerSC>
  )
}

const ContainerSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  userSelect: 'none',
}))

const ActionButtonsSC = styled.div(({ theme }) => ({
  zIndex: 1,
  position: 'absolute',
  right: theme.spacing.medium,
  top: theme.spacing.medium,
  gap: theme.spacing.xsmall,
  display: 'flex',
  alignItems: 'center',

  transition: 'opacity 0.2s ease',
  opacity: 0,
  pointerEvents: 'none',
  [`*:hover > &`]: {
    opacity: 1,
    pointerEvents: 'auto',
    transition: 'opacity 0.2s ease',
  },
}))

function useGlobalPan(setPosition: Dispatch<SetStateAction<Position>>) {
  const [isDragging, setIsDragging] = useState(false)
  const handleMouseDown = () => setIsDragging(true)

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) =>
      setPosition(({ x, y }) => ({ x: x + e.movementX, y: y + e.movementY }))

    const handleMouseUp = () => setIsDragging(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setPosition])

  return { isDragging, handleMouseDown }
}
