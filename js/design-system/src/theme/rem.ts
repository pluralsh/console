// All rem values are authored against a 16px root. The root then scales with
// viewport width via ROOT_FONT_SIZE_STEPS, so everything sized in rem (text,
// icons, spacing) grows or shrinks together.
export const REM_BASE_PX = 16

// Allowed rem values: 0.125rem steps up to 1rem, 0.25rem steps up to 4rem,
// 0.5rem steps up to 8rem, whole rems beyond. Anything finer than 0.125rem
// (2px) is a hairline nudge and stays in px so it doesn't scale.
const REM_STEPS = [
  { max: 1, step: 0.125 },
  { max: 4, step: 0.25 },
  { max: 8, step: 0.5 },
  { max: Infinity, step: 1 },
] as const

// Allowed font sizes (rem): 10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72px.
export const TYPE_SCALE = [
  0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 3.75, 4.5,
] as const

// Letter-spacing uses em tracking so it follows the element's font size.
export const TRACKING = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const

// Ties round to the even step, so odd px values land on the 4px grid.
export function snapRem(rem: number): number {
  const abs = Math.abs(rem)
  const { step } = REM_STEPS.find(({ max }) => abs <= max) ?? REM_STEPS[3]
  const units = abs / step
  const floor = Math.floor(units)
  const rounded =
    Math.abs(units - floor - 0.5) < 1e-9
      ? floor + (floor % 2)
      : Math.round(units)

  return Math.sign(rem) * rounded * step
}

export function pxToRem(px: number): string {
  if (px === 0) return '0'
  if (Math.abs(px) < 2) return `${px}px`

  return `${snapRem(px / REM_BASE_PX)}rem`
}

// Absolute px so the browser's default font-size setting doesn't rescale the
// whole UI. Ordered by ascending minWidth.
export const ROOT_FONT_SIZE_STEPS = [
  { minWidth: 0, fontSize: '15px' },
  { minWidth: 1280, fontSize: '16px' }, // e.g. 14" MacBook Pro (1512px)
  { minWidth: 1920, fontSize: '17px' },
  { minWidth: 2560, fontSize: '18px' },
] as const

export function getRemPx(): number {
  if (typeof document === 'undefined') return REM_BASE_PX

  return (
    parseFloat(getComputedStyle(document.documentElement).fontSize) ||
    REM_BASE_PX
  )
}
