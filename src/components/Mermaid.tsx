import {
  ComponentPropsWithoutRef,
  Ref,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useState,
} from 'react'
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  IconFrame,
  ReloadIcon,
  styledTheme,
} from '..'
import { useCopyText } from './Code'
import Highlight from './Highlight'
import { PanZoomWrapper } from './PanZoomWrapper'

const MERMAID_CDN_URL =
  'https://cdn.jsdelivr.net/npm/mermaid@11.12.1/dist/mermaid.min.js'
const NOT_LOADED_ERROR = 'Mermaid not loaded'

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
    let numRetries = 0
    let pollTimeout: NodeJS.Timeout | null = null
    // poll for when window.mermaid becomes available
    const checkAndRender = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setSvgStr(await renderMermaid(diagram))
        setIsLoading(false)
      } catch (caughtErr) {
        let err = caughtErr
        if (!(caughtErr instanceof Error)) err = new Error(caughtErr)
        // if not loaded yet, wait and retry
        if (err.message.includes(NOT_LOADED_ERROR) && numRetries < 50) {
          pollTimeout = setTimeout(checkAndRender, 150)
          numRetries++
        } else {
          console.error('Error parsing Mermaid (rendering plaintext):', err)
          setError(err)
          setIsLoading(false)
          cachedRenders[id] = err
        }
      }
    }
    checkAndRender()

    return () => clearTimeout(pollTimeout)
  }, [diagram, setError, svgStr])

  if (error)
    return (
      <Highlight
        key={diagram}
        language="mermaid"
      >
        {diagram}
      </Highlight>
    )

  return (
    <>
      <script
        async
        src={MERMAID_CDN_URL}
      />
      <PanZoomWrapper
        key={panZoomKey}
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
          <div css={{ color: styledTheme.colors.grey[950] }}>
            Loading diagram...
          </div>
        ) : (
          svgStr && (
            <div
              dangerouslySetInnerHTML={{ __html: svgStr }}
              style={{ textAlign: 'center' }}
            />
          )
        )}
      </PanZoomWrapper>
    </>
  )
}

let initialized = false
const getOrInitializeMermaid = () => {
  if (!window.mermaid) return null
  if (!initialized) {
    window.mermaid.initialize({ startOnLoad: false })
    initialized = true
  }
  return window.mermaid
}

const renderMermaid = async (code: string) => {
  const mermaid = getOrInitializeMermaid()
  if (!mermaid) throw new Error(NOT_LOADED_ERROR)
  const id = getMermaidId(code)
  const { svg } = await mermaid.render(id, code)
  cachedRenders[id] = svg
  return svg
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
