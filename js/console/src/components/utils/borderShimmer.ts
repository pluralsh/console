import { useEffect, useState } from 'react'
import { CSSObject, DefaultTheme } from 'styled-components'

const ANIMATION_SPEED_S = 4
// run every 20 minutes for 6 seconds
const ANIMATION_ON_MS = 6_000
const ANIMATION_PERIOD_MS = 20 * 60 * 1000

export function useBorderShimmer({
  enabled = true,
  onMs = ANIMATION_ON_MS,
  periodMs = ANIMATION_PERIOD_MS,
}: {
  enabled?: boolean
  onMs?: number
  periodMs?: number
} = {}) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!enabled) return

    let timeoutId: NodeJS.Timeout
    const trigger = () => {
      if (timeoutId) clearTimeout(timeoutId)
      setOn(true)
      timeoutId = setTimeout(() => setOn(false), onMs)
    }
    const startId = setTimeout(trigger, 0)
    const intervalId = setInterval(trigger, periodMs + onMs)
    return () => {
      clearTimeout(startId)
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [enabled, onMs, periodMs])
  return on
}

export function borderShimmerStyles({
  theme,
  showAnimation,
  fillColor,
}: {
  theme: DefaultTheme
  showAnimation: boolean
  fillColor: string
}): CSSObject {
  return {
    overflow: 'visible',
    '&, &:hover, &:focus, &:focus-visible': {
      '@property --border-angle-1': {
        syntax: "'<angle>'",
        inherits: 'true',
        initialValue: '0deg',
      },
      '@property --border-angle-2': {
        syntax: "'<angle>'",
        inherits: 'true',
        initialValue: '180deg',
      },
      '--border-angle-1': '0deg',
      '--border-angle-2': '180deg',
      ...(showAnimation
        ? {
            border: '1px solid transparent',
            backgroundColor: 'transparent',
          }
        : {}),
      backgroundImage: `
        linear-gradient(${fillColor}, ${fillColor}),
        conic-gradient(
          from var(--border-angle-1) at 25% 30%,
          transparent,
          ${theme.colors['border-outline-focused']} 12%,
          transparent 32%,
          transparent
        ),
        conic-gradient(
          from var(--border-angle-2) at 75% 60%,
          transparent,
          ${theme.colors['border-input']} 12%,
          transparent 60%,
          transparent
        )
      `,
      backgroundClip: 'padding-box, border-box, border-box',
      backgroundOrigin: 'border-box',
      animation: `rotateBorderShimmerA ${ANIMATION_SPEED_S}s linear infinite, rotateBorderShimmerB ${ANIMATION_SPEED_S * 1.5}s linear infinite`,
      animationPlayState: showAnimation ? 'running' : 'paused',
      '@keyframes rotateBorderShimmerA': {
        to: { '--border-angle-1': '360deg' },
      },
      '@keyframes rotateBorderShimmerB': {
        to: { '--border-angle-2': '-360deg' },
      },
    },
  }
}
