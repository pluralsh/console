import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from 'react'
import styled from 'styled-components'

type Position = { x: number; y: number }

export function PanZoomWrapper({
  children,
  minZoom = 0.1,
  maxZoom = 5,
  zoomSpeed = 0.0025,
}: {
  children?: ReactNode
  minZoom?: number
  maxZoom?: number
  zoomSpeed?: number
}) {
  const [scale, setScale] = useState(1)
  const [{ x, y }, setPosition] = useState<Position>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { isDragging, handleMouseDown } = useGlobalPan(setPosition)

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return

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

  return (
    <ContainerSC
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{
        '--pan-x': `${x}px`,
        '--pan-y': `${y}px`,
        '--zoom-scale': scale,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {children}
    </ContainerSC>
  )
}

const ContainerSC = styled.div(() => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  userSelect: 'none',
  // hacky, will only work for mermaid diagrams for now. should bake into DS and make this whole component more generalized
  '& svg[id^="mermaid-"]': {
    zIndex: 0,
    transform: 'translate(var(--pan-x), var(--pan-y)) scale(var(--zoom-scale))',
    transformOrigin: '0 0',
  },
  [`& :has(svg[id^="mermaid-"])`]: { height: '100%', overflow: 'hidden' },
  [`& :has(> button)`]: { height: 'auto', zIndex: 1 },
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
