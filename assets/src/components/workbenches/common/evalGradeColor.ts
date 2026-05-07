export function evalGradeToColor(score: number): string {
  const normalized = clamp(score, 0, 10)

  if (normalized < 1) return '#E95374' // red[400]
  if (normalized < 2) return '#F2788D' // red[300]
  if (normalized < 3) return '#F599A8' // red[200]
  if (normalized < 4) return '#FAC7D0' // red[100]

  if (normalized < 5) return '#FFF170' // yellow[300]
  if (normalized < 6) return '#FFCF33' // yellow[400]
  if (normalized < 7) return '#F5AF00' // yellow[500]

  if (normalized < 8) return '#6AF1C2' // green[300]
  if (normalized < 9) return '#3CECAF' // green[400]
  return '#17E8A0' // green[500]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
