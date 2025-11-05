import {
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type WheelEvent,
} from 'react'
import styled from 'styled-components'

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
  const [{ x, y }, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) =>
    isDragging &&
    setPosition(({ x, y }) => ({ x: x + e.movementX, y: y + e.movementY }))

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => setIsDragging(false)

  return (
    <ContainerSC
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
    transition: 'transform 0.05s ease-out',
  },
  [`& :has(svg[id^="mermaid-"])`]: { height: '100%', overflow: 'hidden' },
  [`& :has(> button)`]: { height: 'auto', zIndex: 1 },
}))
