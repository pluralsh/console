import { Flex, severityToColor } from '@pluralsh/design-system'
import { healthScoreToSeverity } from 'components/cd/clusters/ClusterHealthChip'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import { TreeMap, TreeMapData } from 'components/utils/TreeMap'
import {
  ClusterHealthScoreFragment,
  ClustersRowFragment,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import chroma from 'chroma-js'
import { HomeFilterOptionCard } from '../HomeFilterOptionCard'
import { truncatedGraphLabel } from 'components/utils/UtilizationHeatmap'

export type HealthScoreFilterLabel = keyof typeof healthScoreLabelToRange

export function ClusterHealthScoresHeatmap({
  clusters,
  onClick,
}: {
  clusters: ClustersRowFragment[]
  onClick: (clusterName: string) => void
}) {
  const { colors } = useTheme()
  const data = useMemo(() => getHeatmapData(clusters), [clusters])

  const getColor = ({ value }: { value: number }) => {
    const invertedValue = 100 - value
    const normalizedValue = (invertedValue % 20.5) / 20.5 // because the buckets are roughly in ranges of 20-21 spaced equally
    return chroma(getHealthScoreBaseColor(invertedValue)).set(
      'hsl.l',
      0.8 - normalizedValue / 5
    )
  }

  return (
    <TreeMap
      data={data}
      colors={getColor}
      label={truncatedGraphLabel}
      onClick={({ id }) => onClick(id)} // id will be the cluster name
      valueFormat={(value) => `${100 - value}`}
      tooltip={({ node }) => (
        <ChartTooltip
          color={node.color}
          value={
            <span
              css={{
                color:
                  colors[
                    severityToColor[healthScoreToSeverity(100 - node.value)]
                  ],
              }}
            >
              {node.formattedValue}
            </span>
          }
          label={node.id}
        />
      )}
    />
  )
}

export function ClusterHealthScoresFilterBtns({
  selectedFilter,
  onSelect,
  values,
}: {
  selectedFilter: HealthScoreFilterLabel
  onSelect: (filter: HealthScoreFilterLabel) => void
  values: Record<HealthScoreFilterLabel, number>
}) {
  return (
    <Flex
      gap="small"
      flexWrap="wrap"
    >
      {selectableFilterOptions.map((filter) => (
        <HomeFilterOptionCard
          key={filter}
          selected={selectedFilter === filter}
          onSelect={onSelect}
          onDeselect={() => onSelect('All')}
          name={filter}
          value={values[filter]}
          color={healthScoreLabelToBaseColor[filter]}
        />
      ))}
    </Flex>
  )
}

export const aggregateHealthScoreStats = (
  clusters: ClusterHealthScoreFragment[]
): Record<HealthScoreFilterLabel, number> => {
  const aggregatedMap: Record<HealthScoreFilterLabel, number> = {
    All: 0,
    '>80': 0,
    '61 - 80': 0,
    '41 - 60': 0,
    '20 - 40': 0,
    '<20': 0,
  }
  clusters.forEach((cluster) => {
    if (cluster.healthScore === null || cluster.healthScore === undefined)
      return
    if (cluster.healthScore > 80) ++aggregatedMap['>80']
    else if (cluster.healthScore > 60) ++aggregatedMap['61 - 80']
    else if (cluster.healthScore > 40) ++aggregatedMap['41 - 60']
    else if (cluster.healthScore >= 20) ++aggregatedMap['20 - 40']
    else ++aggregatedMap['<20']
    ++aggregatedMap.All
  })
  return aggregatedMap
}

export const healthScoreLabelToRange = {
  All: undefined,
  '>80': { min: 81, max: 100 },
  '61 - 80': { min: 61, max: 80 },
  '41 - 60': { min: 41, max: 60 },
  '20 - 40': { min: 20, max: 40 },
  '<20': { min: 0, max: 19 },
}

const selectableFilterOptions = Object.keys(healthScoreLabelToRange).filter(
  (key) => key !== 'All'
) as HealthScoreFilterLabel[]

const healthScoreLabelToBaseColor: Record<
  Exclude<HealthScoreFilterLabel, 'All'>,
  string
> = {
  '>80': '#2F6B3F',
  '61 - 80': '#C2E085',
  '41 - 60': '#F8DB95',
  '20 - 40': '#EFAD6E',
  '<20': '#D35940',
}

const getHeatmapData = (clusters: ClustersRowFragment[]): TreeMapData => {
  return {
    name: 'Clusters',
    children: clusters.map((cluster) => ({
      name: cluster.name,
      // reversed so the worse health scores are bigger
      // unfortunately this means we have to re-invert it everywhere else
      amount: 100 - (cluster.healthScore ?? 0),
    })),
  }
}

const getHealthScoreBaseColor = (healthScore: number) => {
  if (healthScore > 80) return healthScoreLabelToBaseColor['>80']
  if (healthScore > 60) return healthScoreLabelToBaseColor['61 - 80']
  if (healthScore > 40) return healthScoreLabelToBaseColor['41 - 60']
  if (healthScore >= 20) return healthScoreLabelToBaseColor['20 - 40']
  return healthScoreLabelToBaseColor['<20']
}
