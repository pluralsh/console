import { CSSProperties } from 'styled-components'

export function makeGrid({
  gap,
  maxCols,
  minColWidth,
  maxColWidth,
}: {
  gap: number | string
  maxCols: number
  minColWidth: number
  maxColWidth?: number
}): CSSProperties {
  const gapLength = typeof gap === 'number' ? `${gap}px` : gap
  const totalGapWidth = `(${maxCols - 1} * ${gapLength})`

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(max(${minColWidth}px, calc((100% - ${totalGapWidth}) / ${maxCols})), 1fr))`,
    gap,
    ...(maxColWidth
      ? {
          maxWidth: `calc(${maxCols * maxColWidth}px + ${totalGapWidth})`,
        }
      : {}),
  }
}
