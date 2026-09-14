import {
  type ComponentPropsWithRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled, { css, keyframes, useTheme } from 'styled-components'

import { SemanticColorKey } from '../theme/colors'

export type AgentLoadingVariant =
  | 'cursor'
  | 'cursorWave'
  | 'cursorEq'
  | 'slide'
  | 'wave'
  | 'pulse'
  | 'whimsy'
  | 'paper'
  | 'paperLong'
  | 'aaron'
export type AgentLoadingState =
  'working' | 'waiting' | 'idle' | 'success' | 'error'

const DOTS = 9

const CURSOR_FRAMES: number[][] = [
  [1, 2, 4],
  [1, 2, 3, 4, 5],
  [3, 6],
  [2, 3, 5, 6, 8, 9],
  [5, 7, 8, 9],
  [1, 4, 5, 6, 7, 8, 9],
  [1, 4, 7],
  [1, 2, 4, 7, 8],
]

function cursorDotFrames(cell: number) {
  const lit = CURSOR_FRAMES.map((frame) => frame.includes(cell))
  const step = (on: boolean) =>
    `opacity: ${on ? 'var(--on)' : 'var(--off)'}; transform: scale(${on ? 1 : 0.42});`

  return keyframes`
    0%, 8% { ${step(lit[0])} }
    12.5%, 20.5% { ${step(lit[1])} }
    25%, 33% { ${step(lit[2])} }
    37.5%, 45.5% { ${step(lit[3])} }
    50%, 58% { ${step(lit[4])} }
    62.5%, 70.5% { ${step(lit[5])} }
    75%, 83% { ${step(lit[6])} }
    87.5%, 95.5% { ${step(lit[7])} }
    100% { ${step(lit[0])} }
  `
}

const cursorCell = Array.from({ length: DOTS }, (_, i) =>
  cursorDotFrames(i + 1)
)

const slideRow = keyframes`
  0%, 12% { transform: translate(0, 0); }
  28%, 46% { transform: translate(var(--span), 0); }
  58%, 100% { transform: translate(0, 0); }
`

const slideRowReverse = keyframes`
  0%, 12% { transform: translate(0, 0); }
  28%, 46% { transform: translate(calc(-1 * var(--span)), 0); }
  58%, 100% { transform: translate(0, 0); }
`

const wave = keyframes`
  0%, 72%, 100% { opacity: var(--off); transform: scale(0.7); }
  18% { opacity: var(--on); transform: scale(1); }
`

const cursorWave = keyframes`
  0%, 100% { opacity: var(--off); transform: scale(0.42); }
  28% { opacity: var(--on); transform: scale(1); }
  48% { opacity: 0.42; transform: scale(0.7); }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.28; transform: scale(0.78); }
  50% { opacity: var(--on); transform: scale(1); }
`

const eqLow = keyframes`
  0%, 100% { opacity: var(--on); transform: scale(1); }
  52% { opacity: 0.55; transform: scale(0.82); }
`

const eqMid = keyframes`
  0%, 14% { opacity: var(--off); transform: scale(0.42); }
  24%, 62% { opacity: var(--on); transform: scale(1); }
  76%, 100% { opacity: var(--off); transform: scale(0.42); }
`

const eqHigh = keyframes`
  0%, 32% { opacity: var(--off); transform: scale(0.42); }
  38%, 48% { opacity: var(--on); transform: scale(1); }
  58%, 100% { opacity: var(--off); transform: scale(0.42); }
`

const EQ_COL_SPEED = [0.82, 1.18, 0.64]
const EQ_COL_DELAY = [0, 0.1, 0.22]
const EQ_ROW_FRAME = [eqHigh, eqMid, eqLow]

const easeMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation-duration: calc(var(--motion, 1s) * 3) !important;
  }
`

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)

    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

const AgentLoadingIconSC = styled.span<{
  $size: number
  $dot: number
  $span: number
  $color: string
  $duration: string
  $variant: AgentLoadingVariant
  $state: AgentLoadingState
}>(({ $size, $dot, $span, $color, $duration, $variant, $state }) => {
  const paused = $state === 'idle' || $state === 'success' || $state === 'error'
  const allOn = paused

  return css`
    --on: 1;
    --off: 0.16;
    --span: ${$span}px;
    --motion: ${$duration};
    display: inline-grid;
    flex-shrink: 0;
    width: ${$size}px;
    height: ${$size}px;
    grid-template-columns: repeat(3, ${$dot}px);
    grid-template-rows: repeat(3, ${$dot}px);
    justify-content: space-between;
    align-content: space-between;
    color: ${$color};

    i {
      display: block;
      width: ${$dot}px;
      height: ${$dot}px;
      border-radius: 50%;
      background: currentColor;
      animation-duration: ${$duration};
      animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      animation-iteration-count: infinite;
      animation-play-state: ${paused ? 'paused' : 'running'};
      ${easeMotion}
    }

    ${
      $variant === 'cursor' &&
      cursorCell.map(
        (frame, i) => css`
          i:nth-child(${i + 1}) {
            animation-name: ${allOn ? 'none' : frame};
            animation-timing-function: cubic-bezier(0.45, 0.05, 0.2, 1);
          }
        `
      )
    }

    ${
      $variant === 'cursorWave' &&
      css`
        i {
          animation-name: ${allOn ? 'none' : cursorWave};
          animation-timing-function: cubic-bezier(0.45, 0.05, 0.2, 1);
        }
        ${Array.from({ length: DOTS }, (_, i) => {
          const col = i % 3
          const row = Math.floor(i / 3)

          return css`
            i:nth-child(${i + 1}) {
              animation-delay: ${col * 0.14 + row * 0.06}s;
            }
          `
        })}
      `
    }

    ${
      $variant === 'cursorEq' &&
      css`
        i {
          animation-timing-function: cubic-bezier(0.22, 0.7, 0.28, 1);
        }
        ${Array.from({ length: DOTS }, (_, i) => {
          const col = i % 3
          const row = Math.floor(i / 3)

          return css`
            i:nth-child(${i + 1}) {
              animation-name: ${allOn ? 'none' : EQ_ROW_FRAME[row]};
              animation-duration: calc(${$duration} * ${EQ_COL_SPEED[col]});
              animation-delay: ${EQ_COL_DELAY[col]}s;
            }
          `
        })}
      `
    }

    ${
      $variant === 'slide' &&
      css`
        i {
          animation-timing-function: cubic-bezier(0.45, 0, 0.2, 1);
          opacity: var(--on);
        }
        i:nth-child(-n + 3) {
          animation-name: ${allOn ? 'none' : slideRow};
        }
        i:nth-child(n + 4):nth-child(-n + 6) {
          animation-name: ${allOn ? 'none' : slideRowReverse};
        }
        i:nth-child(n + 7) {
          animation-name: ${allOn ? 'none' : slideRow};
        }
      `
    }

    ${
      $variant === 'wave' &&
      css`
        i {
          animation-name: ${allOn ? 'none' : wave};
        }
        ${Array.from(
          { length: DOTS },
          (_, i) => css`
            i:nth-child(${i + 1}) {
              animation-delay: ${i * 0.07}s;
            }
          `
        )}
      `
    }

    ${
      $variant === 'pulse' &&
      css`
        i {
          animation-name: ${allOn ? 'none' : pulse};
        }
        i:nth-child(5) {
          animation-delay: 0.18s;
        }
      `
    }

    ${
      $state === 'idle' &&
      css`
        i {
          opacity: 0.38;
        }
      `
    }
  `
})

const StatusBulletSC = styled.span<{
  $size: number
  $dot: number
  $color: string
}>(
  ({ $size, $dot, $color }) => css`
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: ${$size}px;
    height: ${$size}px;
    color: ${$color};

    i {
      display: block;
      width: ${$dot}px;
      height: ${$dot}px;
      border-radius: 50%;
      background: currentColor;
    }
  `
)

function StatusBullet({
  size,
  color,
  ...props
}: {
  size: number
  color: string
} & ComponentPropsWithRef<'span'>) {
  const dot = Math.max(3, Math.round(size * 0.32))

  return (
    <StatusBulletSC
      $size={size}
      $dot={dot}
      $color={color}
      aria-hidden
      {...props}
    >
      <i />
    </StatusBulletSC>
  )
}

function stateColor(
  state: AgentLoadingState,
  colors: ReturnType<typeof useTheme>['colors'],
  color?: SemanticColorKey,
  variant?: AgentLoadingVariant
): string {
  if (state === 'error') return colors['icon-danger']
  if (color) return colors[color]
  if (variant === 'paper' || variant === 'paperLong')
    return colors['icon-primary']
  return colors['icon-xlight']
}

function stateDuration(state: AgentLoadingState, variant: AgentLoadingVariant) {
  if (state === 'waiting') {
    if (variant === 'cursor') return '8s'
    if (variant === 'cursorWave') return '2.4s'
    if (variant === 'cursorEq') return '2.6s'
    if (variant === 'whimsy') return '1.8s'
    if (variant === 'aaron') return '1.5s'
    if (variant === 'paper' || variant === 'paperLong') return '1.6s'
    return '2s'
  }
  if (variant === 'cursor') return '5.8s'
  if (variant === 'cursorWave') return '1.5s'
  if (variant === 'cursorEq') return '1.55s'
  if (variant === 'whimsy') return '1.05s'
  if (variant === 'aaron') return '0.9s'
  if (variant === 'paper' || variant === 'paperLong') return '1s'
  if (variant === 'slide') return '1.8s'
  if (variant === 'wave') return '1.35s'
  if (variant === 'pulse') return '1.35s'
  return '1.2s'
}

export function AgentLoadingIcon({
  size = 12,
  color,
  variant = 'cursor',
  state = 'working',
  columns,
  rows,
  ...props
}: {
  size?: number
  color?: SemanticColorKey
  variant?: AgentLoadingVariant
  state?: AgentLoadingState
  columns?: number
  rows?: number
} & ComponentPropsWithRef<'span'>) {
  const { colors } = useTheme()
  const fill = stateColor(state, colors, color, variant)
  const duration = stateDuration(state, variant)
  const dot = Math.max(2, Math.round(size * 0.22))
  const span = (size - dot) / 2

  if (state === 'success' || state === 'error') {
    return (
      <StatusBullet
        size={size}
        color={
          state === 'error'
            ? colors['icon-danger']
            : color
              ? colors[color]
              : colors['icon-xlight']
        }
        {...props}
      />
    )
  }

  if (variant === 'paper' || variant === 'paperLong') {
    return (
      <PaperRain
        size={size}
        color={fill}
        state={state}
        columns={columns ?? (variant === 'paperLong' ? 12 : 4)}
        rows={rows ?? 2}
        {...props}
      />
    )
  }

  if (variant === 'aaron') {
    return (
      <AaronMan
        size={size}
        color={fill}
        duration={duration}
        state={state}
        {...props}
      />
    )
  }

  if (variant === 'whimsy') {
    return (
      <WhimsyBird
        size={size}
        color={fill}
        duration={duration}
        state={state}
        {...props}
      />
    )
  }

  return (
    <AgentLoadingIconSC
      $size={size}
      $dot={dot}
      $span={span}
      $color={fill}
      $duration={duration}
      $variant={variant}
      $state={state}
      aria-hidden
      {...props}
    >
      {Array.from({ length: DOTS }, (_, i) => (
        <i key={i} />
      ))}
    </AgentLoadingIconSC>
  )
}

function cssColorToRgb(color: string): string {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    const n = parseInt(h, 16)
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
  }
  const rgb = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (rgb) return `${rgb[1]}, ${rgb[2]}, ${rgb[3]}`
  return '52, 133, 249'
}

type ColumnState = {
  pos: Float32Array
  speed: Float32Array
  wavePhase: Float32Array
}

function createColumns(count: number, wrap: number): ColumnState {
  const pos = new Float32Array(count)
  const speed = new Float32Array(count)
  const wavePhase = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i] = Math.random() * wrap
    speed[i] = 0.85 + 0.3 * Math.random()
    wavePhase[i] = Math.random() * Math.PI * 2
  }
  return { pos, speed, wavePhase }
}

const PaperRainSC = styled.span<{ $width: number; $height: number }>(
  ({ $width, $height }) => css`
    display: inline-flex;
    flex-shrink: 0;
    width: ${$width}px;
    height: ${$height}px;

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `
)

function PaperRain({
  size,
  color,
  state,
  columns = 3,
  rows = 3,
  ...props
}: {
  size: number
  color: string
  state: AgentLoadingState
  columns?: number
  rows?: number
} & ComponentPropsWithRef<'span'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colsRef = useRef<ColumnState | null>(null)
  const timeRef = useRef(0)
  const lastRef = useRef(-1)
  const reduceMotion = usePrefersReducedMotion()
  const paused = state === 'idle' || state === 'success' || state === 'error'
  const cellSize = Math.max(2, size / rows)
  const wrap = rows + 4
  const width = columns * cellSize
  const height = rows * cellSize
  const speed = (state === 'waiting' ? 0.75 : 1.2) * (reduceMotion ? 0.3 : 1)
  const rgb = cssColorToRgb(color)

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      if (!colsRef.current || colsRef.current.pos.length !== columns) {
        colsRef.current = createColumns(columns, wrap)
      }
      const cols = colsRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const last = lastRef.current
      lastRef.current = now
      if (last < 0) return
      const dt = (now - last) / (1000 / 60)
      if (!paused) timeRef.current += dt
      const t = timeRef.current
      const radius = 0.35 * cellSize
      const cx = 0.5 * cellSize

      for (let col = 0; col < columns; col++) {
        if (!paused) {
          cols.pos[col] += 0.12 * speed * cols.speed[col] * dt
          cols.pos[col] %= wrap
        }
        const y = cols.pos[col]
        if (!paused) {
          cols.speed[col] =
            0.85 + 0.15 * Math.sin(-cols.wavePhase[col] + 0.02 * t)
        }
        const trail = 1.5 + 2.5 * (1 - (cols.speed[col] - 0.85) / 0.3)
        const x = col * cellSize + cx
        const idleAlpha = state === 'idle' ? 0.38 : 1

        if (state === 'success') {
          for (let row = 0; row < rows; row++) {
            ctx.fillStyle = `rgba(${rgb}, 1)`
            ctx.beginPath()
            ctx.arc(x, row * cellSize + cx, radius, 0, Math.PI * 2)
            ctx.fill()
          }
          continue
        }

        if (state === 'error') {
          for (let row = 0; row < rows; row++) {
            if (row !== col && row !== rows - 1 - col) continue
            ctx.fillStyle = `rgba(${rgb}, 1)`
            ctx.beginPath()
            ctx.arc(x, row * cellSize + cx, radius, 0, Math.PI * 2)
            ctx.fill()
          }
          continue
        }

        for (let row = 0; row < rows; row++) {
          const dist = y - row
          if (dist < 0 || dist >= trail) continue
          const alpha = (1 - dist / trail) * idleAlpha
          ctx.fillStyle = `rgba(${rgb}, ${alpha})`
          ctx.beginPath()
          ctx.arc(x, row * cellSize + cx, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },
    [cellSize, columns, height, paused, rgb, rows, speed, state, width, wrap]
  )

  useEffect(() => {
    let live = true
    const tick = (now: number) => {
      if (!live) return
      draw(now)
      frame = requestAnimationFrame(tick)
    }
    let frame = requestAnimationFrame(tick)
    return () => {
      live = false
      cancelAnimationFrame(frame)
    }
  }, [draw])

  return (
    <PaperRainSC
      $width={width}
      $height={height}
      aria-hidden
      {...props}
    >
      <canvas ref={canvasRef} />
    </PaperRainSC>
  )
}

const BIRD_A: Array<[number, number]> = [
  [6, 1],
  [7, 1],
  [8, 1],
  [5, 2],
  [6, 2],
  [8, 2],
  [9, 2],
  [5, 3],
  [6, 3],
  [7, 3],
  [8, 3],
  [9, 3],
  [10, 3],
  [1, 4],
  [2, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [8, 4],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [6, 5],
  [7, 5],
  [8, 5],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 6],
  [7, 6],
  [2, 7],
  [5, 7],
  [7, 7],
  [5, 8],
  [7, 8],
  [4, 9],
  [8, 9],
]

const BIRD_B: Array<[number, number]> = [
  [6, 1],
  [7, 1],
  [8, 1],
  [2, 2],
  [5, 2],
  [6, 2],
  [8, 2],
  [9, 2],
  [1, 3],
  [2, 3],
  [5, 3],
  [6, 3],
  [7, 3],
  [8, 3],
  [9, 3],
  [10, 3],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [8, 4],
  [3, 5],
  [4, 5],
  [5, 5],
  [6, 5],
  [7, 5],
  [8, 5],
  [1, 4],
  [4, 6],
  [5, 6],
  [6, 6],
  [7, 6],
  [5, 7],
  [7, 7],
  [6, 8],
  [7, 8],
  [6, 9],
  [8, 9],
]

const danceHop = keyframes`
  0%, 12% { transform: translateX(-22%) scaleX(1); }
  13%, 37% { transform: translateX(22%) scaleX(1); }
  38%, 62% { transform: translateX(22%) scaleX(-1); }
  63%, 87% { transform: translateX(-22%) scaleX(-1); }
  88%, 100% { transform: translateX(-22%) scaleX(1); }
`

const dancePose = keyframes`
  0%, 24% { opacity: 1; }
  25%, 49% { opacity: 0; }
  50%, 74% { opacity: 1; }
  75%, 100% { opacity: 0; }
`

const dancePoseAlt = keyframes`
  0%, 24% { opacity: 0; }
  25%, 49% { opacity: 1; }
  50%, 74% { opacity: 0; }
  75%, 100% { opacity: 1; }
`

const WhimsyBirdSC = styled.span<{
  $size: number
  $color: string
  $duration: string
  $state: AgentLoadingState
}>(({ $size, $color, $duration, $state }) => {
  const paused = $state === 'idle' || $state === 'success' || $state === 'error'

  return css`
    display: inline-flex;
    flex-shrink: 0;
    width: ${$size}px;
    height: ${$size}px;
    --motion: ${$duration};
    color: ${$color};
    overflow: visible;

    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      animation-name: ${paused ? 'none' : danceHop};
      animation-duration: ${$duration};
      animation-timing-function: steps(1, end);
      animation-iteration-count: infinite;
      transform-origin: center;
      ${easeMotion}
    }

    .pose-a {
      animation-name: ${paused ? 'none' : dancePose};
      animation-duration: ${$duration};
      animation-timing-function: steps(1, end);
      animation-iteration-count: infinite;
      ${easeMotion}
    }

    .pose-b {
      animation-name: ${paused ? 'none' : dancePoseAlt};
      animation-duration: ${$duration};
      animation-timing-function: steps(1, end);
      animation-iteration-count: infinite;
      ${easeMotion}
    }

    ${
      $state === 'idle' &&
      css`
        .pose-b {
          opacity: 0;
        }
      `
    }

    ${
      $state === 'success' &&
      css`
        .pose-a {
          opacity: 0;
        }
        .pose-b {
          opacity: 1;
        }
      `
    }

    ${
      $state === 'error' &&
      css`
        svg {
          transform: rotate(90deg) translateY(8%);
        }
        .pose-b {
          opacity: 0;
        }
      `
    }
  `
})

function PixelSprite({ pixels }: { pixels: Array<[number, number]> }) {
  return (
    <>
      {pixels.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill="currentColor"
        />
      ))}
    </>
  )
}

function WhimsyBird({
  size,
  color,
  duration,
  state,
  ...props
}: {
  size: number
  color: string
  duration: string
  state: AgentLoadingState
} & ComponentPropsWithRef<'span'>) {
  return (
    <WhimsyBirdSC
      $size={size}
      $color={color}
      $duration={duration}
      $state={state}
      aria-hidden
      {...props}
    >
      <svg
        viewBox="0 0 12 11"
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="pose-a">
          <PixelSprite pixels={BIRD_A} />
        </g>
        <g className="pose-b">
          <PixelSprite pixels={BIRD_B} />
        </g>
      </svg>
    </WhimsyBirdSC>
  )
}

// 6-7 dance: one hand up / other down, then the mirror.
const AARON_SIX: Array<[number, number]> = [
  [6, 1],
  [7, 1],
  [6, 2],
  [7, 2],
  [7, 3],
  [7, 4],
  [9, 4],
  [10, 4],
  [5, 5],
  [7, 5],
  [4, 6],
  [7, 6],
  [7, 7],
  [8, 7],
  [3, 8],
  [4, 8],
  [8, 8],
  [8, 9],
]

const AARON_SEVEN: Array<[number, number]> = [
  [4, 1],
  [5, 1],
  [4, 2],
  [5, 2],
  [4, 3],
  [1, 4],
  [2, 4],
  [4, 4],
  [4, 5],
  [6, 5],
  [4, 6],
  [7, 6],
  [3, 7],
  [4, 7],
  [3, 8],
  [7, 8],
  [8, 8],
  [3, 9],
]

const aaronBounce = keyframes`
  0%, 49% { transform: translate(-16%, 4%); }
  50%, 100% { transform: translate(16%, 4%); }
`

const aaronPoseSix = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`

const aaronPoseSeven = keyframes`
  0%, 49% { opacity: 0; }
  50%, 100% { opacity: 1; }
`

const AaronManSC = styled.span<{
  $size: number
  $color: string
  $duration: string
  $state: AgentLoadingState
}>(({ $size, $color, $duration, $state }) => {
  const paused = $state === 'idle' || $state === 'success' || $state === 'error'

  return css`
    display: inline-flex;
    flex-shrink: 0;
    width: ${$size}px;
    height: ${$size}px;
    --motion: ${$duration};
    color: ${$color};
    overflow: visible;

    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      animation-name: ${paused ? 'none' : aaronBounce};
      animation-duration: ${$duration};
      animation-timing-function: steps(1, end);
      animation-iteration-count: infinite;
      transform-origin: center bottom;
      ${easeMotion}
    }

    .pose-six,
    .pose-seven {
      animation-duration: ${$duration};
      animation-timing-function: steps(1, end);
      animation-iteration-count: infinite;
      ${easeMotion}
    }

    .pose-six {
      animation-name: ${paused ? 'none' : aaronPoseSix};
    }
    .pose-seven {
      animation-name: ${paused ? 'none' : aaronPoseSeven};
      opacity: 0;
    }

    ${
      $state === 'idle' &&
      css`
        .pose-seven {
          opacity: 0;
        }
      `
    }

    ${
      $state === 'success' &&
      css`
        .pose-six {
          opacity: 0;
        }
        .pose-seven {
          opacity: 1;
        }
      `
    }

    ${
      $state === 'error' &&
      css`
        svg {
          transform: rotate(90deg) translateY(12%);
        }
        .pose-seven {
          opacity: 0;
        }
      `
    }
  `
})

function AaronMan({
  size,
  color,
  duration,
  state,
  ...props
}: {
  size: number
  color: string
  duration: string
  state: AgentLoadingState
} & ComponentPropsWithRef<'span'>) {
  return (
    <AaronManSC
      $size={size}
      $color={color}
      $duration={duration}
      $state={state}
      aria-hidden
      {...props}
    >
      <svg
        viewBox="0 0 12 11"
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="pose-six">
          <PixelSprite pixels={AARON_SIX} />
        </g>
        <g className="pose-seven">
          <PixelSprite pixels={AARON_SEVEN} />
        </g>
      </svg>
    </AaronManSC>
  )
}
