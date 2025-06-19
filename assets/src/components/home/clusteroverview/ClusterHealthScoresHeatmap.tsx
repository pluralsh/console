export const healthScoreLabelToRange = {
  All: undefined,
  '>80': { min: 81 },
  '61 - 80': { min: 61, max: 80 },
  '41 - 60': { min: 41, max: 60 },
  '20 - 40': { min: 20, max: 40 },
  '<20': { max: 19 },
}
export type HealthScoreFilterLabel = keyof typeof healthScoreLabelToRange

export function ClusterHealthScoresHeatmap() {
  return <div>ClusterHealthScoresHeatmap</div>
}

export function ClusterHealthScoresFilterBtns({
  selectedFilter,
  onSelect,
}: {
  selectedFilter: HealthScoreFilterLabel
  onSelect: (filter: HealthScoreFilterLabel) => void
}) {
  return <div>ClusterHealthScoresFilterBtns</div>
}
