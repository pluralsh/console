import {
  green,
  red,
  yellow,
} from '../../../../design-system/src/theme/colors-base'

export function evalGradeToColor(score: number): string {
  const normalized = clamp(score, 0, 10)

  if (normalized < 1) return red[400]
  if (normalized < 2) return red[300]
  if (normalized < 3) return red[200]
  if (normalized < 4) return red[100]

  if (normalized < 5) return yellow[300]
  if (normalized < 6) return yellow[400]
  if (normalized < 7) return yellow[500]

  if (normalized < 8) return green[300]
  if (normalized < 9) return green[400]
  if (normalized < 10) return green[500]
  return green[500]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
