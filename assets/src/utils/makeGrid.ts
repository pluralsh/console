export function makeGrid({
  gap,
  maxCols,
  minColWidth,
}: {
  gap: number
  maxCols: number
  minColWidth: number
}) {
  const gapCount = maxCols - 1
  const totalGapWidth = gapCount * gap

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(max(${minColWidth}px, calc((100% - ${totalGapWidth}px) / ${maxCols})), 1fr))`,
    gap,
  }
}
