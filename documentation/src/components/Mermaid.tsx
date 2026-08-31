// adapted from the Mermaid and PanZoomWrapper components from our DS
// since we can't currently upgrade this repo to the latest version

import {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type Dispatch,
  type ReactNode,
  type Ref,
  type SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  IconFrame,
  ReloadIcon,
} from '@pluralsh/design-system'

import { type Nullable } from '@pluralsh/design-system/dist/types'
import styled, { useTheme } from 'styled-components'

import { useCopyText } from '@src/hooks/useCopyText'

// helps prevent flickering (and potentially expensive recalculations) in virutalized lists
// need to do this outside of React lifecycle memoization (useMemo etc) so it can persist across component mounts/unmounts
const cachedRenders: Record<string, string | Error> = {}

export type MermaidRefHandle = {
  svgStr: Nullable<string>
}

export function Mermaid({
  ref,
  diagram,
  setError: setErrorProp,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof PanZoomWrapper>, 'children'> & {
  diagram: string
  ref?: Ref<MermaidRefHandle>
  setError?: (error: Nullable<Error>) => void
}) {
  const theme = useTheme()
  const [svgStr, setSvgStr] = useState<Nullable<string>>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setErrorState] = useState<Nullable<Error>>(null)
  const [panZoomKey, setPanZoomKey] = useState(0) // increment to force panzoom wrapper to reset
  const { copied, handleCopy } = useCopyText(diagram)

  const setError = useCallback(
    (error: Nullable<Error>) => {
      setErrorState(error)
      setErrorProp?.(error)
    },
    [setErrorProp]
  )

  useImperativeHandle(ref, () => ({ svgStr }))

  useLayoutEffect(() => {
    const id = getMermaidId(diagram)
    const cached = cachedRenders[id]

    if (cached) {
      setIsLoading(false)
      setSvgStr(typeof cached === 'string' ? cached : null)
      setError(cached instanceof Error ? cached : null)

      return
    }

    // need to keep track of this since we're dealing with async ops, helps avoid race condition
    let isMounted = true
    const renderDiagram = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const mermaid = (await import('mermaid')).default
        const elkLayouts = (await import('@mermaid-js/layout-elk')).default

        mermaid.initialize({
          startOnLoad: false,
          flowchart: { defaultRenderer: 'elk' },
        })

        try {
          await mermaid.registerLayoutLoaders(elkLayouts)
        } catch (err) {
          console.error('Failed to register ELK layout with mermaid:', err)
        }
        const { svg } = await mermaid.render(id, diagram)

        if (!isMounted) return

        cachedRenders[id] = svg
        setSvgStr(svg)
        setIsLoading(false)
      } catch (caughtErr) {
        if (!isMounted) return
        const err =
          caughtErr instanceof Error ? caughtErr : new Error(String(caughtErr))

        console.error('Error parsing Mermaid (rendering plaintext):', err)
        setError(err)
        setIsLoading(false)
        cachedRenders[id] = err
      }
    }

    renderDiagram()

    return () => {
      isMounted = false
    }
  }, [diagram, setError])

  if (error) return <div>Error: {error.message}</div>

  return (
    <PanZoomWrapper
      key={panZoomKey}
      css={{ background: 'white', width: 'fit-content' }}
      actionButtons={
        <>
          <IconFrame
            clickable
            onClick={() => setPanZoomKey((key) => key + 1)}
            icon={<ReloadIcon />}
            type="floating"
            tooltip="Reset view to original size"
          />
          <IconFrame
            clickable
            onClick={handleCopy}
            icon={copied ? <CheckIcon /> : <CopyIcon />}
            type="floating"
            tooltip="Copy Mermaid code"
          />
          <IconFrame
            clickable
            onClick={() => svgStr && downloadMermaidSvg(svgStr)}
            icon={<DownloadIcon />}
            type="floating"
            tooltip="Download as PNG"
          />
        </>
      }
      {...props}
    >
      {isLoading ? (
        <div style={{ color: theme.colors.grey[950] }}>Loading diagram...</div>
      ) : (
        svgStr && (
          <div
            dangerouslySetInnerHTML={{ __html: svgStr }}
            style={{ textAlign: 'center' }}
          />
        )
      )}
    </PanZoomWrapper>
  )
}

export const downloadMermaidSvg = (svgStr: string) => {
  const parser = new DOMParser()
  const svg = parser.parseFromString(svgStr, 'text/html').querySelector('svg')

  let parsed = svgStr

  if (!svg)
    console.warn('No SVG element found after parsing, using original string')
  else parsed = new XMLSerializer().serializeToString(svg)

  const img = new Image()

  const utf8Bytes = new TextEncoder().encode(parsed)
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCharCode(byte)
  ).join('')

  img.src = `data:image/svg+xml;base64,${btoa(binaryString)}`

  img.onerror = () => {
    console.error('Failed to convert SVG to image for download')
  }

  img.onload = () => {
    // scale up to high resolution (target 4K width or 4x, whichever is larger)
    const targetWidth = 3840
    const scale = Math.max(targetWidth / img.width, 4)
    // respect browser canvas dimension limits
    const MAX_DIMENSION = 32767
    const finalScale = Math.min(
      scale,
      MAX_DIMENSION / img.width,
      MAX_DIMENSION / img.height
    )

    const canvas = document.createElement('canvas')

    canvas.width = Math.floor(img.width * finalScale)
    canvas.height = Math.floor(img.height * finalScale)

    const ctx = canvas.getContext('2d')

    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'mermaid-diagram.png'
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }
}

// simple djb2 hash to get id from mermaid string
export const getMermaidId = (str: string) => {
  let hash = 5381

  for (let i = 0; i < str.length; i++)
    hash = (hash << 5) + hash + str.charCodeAt(i)

  return `mermaid-${hash >>> 0}`
}

type Position = { x: number; y: number }

export function PanZoomWrapper({
  children,
  minZoom = 0.1,
  maxZoom = 5,
  zoomSpeed = 0.0025,
  actionButtons,
  initialScale = 1,
  initialPosition = { x: 0, y: 0 },
  ...props
}: {
  children?: ReactNode
  minZoom?: number
  maxZoom?: number
  zoomSpeed?: number
  initialScale?: number
  initialPosition?: Position
  actionButtons?: ReactNode
} & ComponentPropsWithRef<'div'>) {
  const [scale, setScale] = useState(initialScale)
  const [{ x, y }, setPosition] = useState<Position>(initialPosition)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isDragging, handleMouseDown } = useGlobalPan(setPosition)

  // native wheel listener with passive: false allows preventDefault to work, so we can avoid scrolling the page
  useEffect(() => {
    const container = containerRef.current

    if (!container) return
    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()
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
