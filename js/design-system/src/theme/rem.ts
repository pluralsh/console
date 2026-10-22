// All rem values are authored against a 16px root. The root then scales with
// viewport width via ROOT_FONT_SIZE_STEPS, so everything sized in rem (text,
// icons, spacing) grows or shrinks together.
export const REM_BASE_PX = 16

export function pxToRem(px: number): string {
  if (px === 0) return '0'

  return `${+(px / REM_BASE_PX).toFixed(6)}rem`
}

// Percentages (of the browser default, normally 16px) so user font-size
// preferences are still honored. Ordered by ascending minWidth.
export const ROOT_FONT_SIZE_STEPS = [
  { minWidth: 0, fontSize: '93.75%' }, //  15px
  { minWidth: 1280, fontSize: '100%' }, // 16px, e.g. 14" MacBook Pro (1512px)
  { minWidth: 1920, fontSize: '106.25%' }, // 17px
  { minWidth: 2560, fontSize: '112.5%' }, //  18px
] as const

export function getRemPx(): number {
  if (typeof document === 'undefined') return REM_BASE_PX

  return (
    parseFloat(getComputedStyle(document.documentElement).fontSize) ||
    REM_BASE_PX
  )
}
