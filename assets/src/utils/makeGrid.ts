import { CSSProperties } from 'styled-components'

export function makeGrid({
  gap,
  maxCols,
  minColWidth,
  maxColWidth,
}: {
  gap: number
  maxCols: number
  minColWidth: number
  maxColWidth?: number
}): CSSProperties {
  const gapCount = maxCols - 1
  const totalGapWidth = gapCount * gap

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(max(${minColWidth}px, calc((100% - ${totalGapWidth}px) / ${maxCols})), 1fr))`,
    gap,
    ...(maxColWidth
      ? {
        maxWidth: maxCols * maxColWidth + totalGapWidth,
      }
      : {}),
  }
}
