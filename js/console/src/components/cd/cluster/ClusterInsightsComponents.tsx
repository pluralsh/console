import {
  AppsIcon,
  Chip,
  ComponentsIcon,
  EmptyState,
  Flex,
  ListIcon,
  SubTab,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'

import usePersistedState from 'components/hooks/usePersistedState.tsx'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid.tsx'
import { ButtonGroup } from 'components/utils/ButtonGroup.tsx'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { InsightComponentPriority } from 'generated/graphql.ts'
import { capitalize, countBy, isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { useSetPageHeaderContent } from '../ContinuousDeployment.tsx'
import { componentHasInsight } from '../clusters/info-flyover/health/ConfigurationIssuesSection.tsx'
import {
  useClusterInsightsContext,
  useSetActionContent,
  useSetNavigationContent,
} from './ClusterInsights.tsx'
import { ClusterInsightComponentCard } from './ClusterInsightComponentCard.tsx'
import {
  priorityToSeverity,
  sortInsightComponents,
} from './ClusterInsightComponentParts.tsx'
import { ClusterInsightComponentsTable } from './ClusterInsightComponentsTable.tsx'

type InsightsView = 'list' | 'board'

const VIEW_STORAGE_KEY = 'cluster-insights-view'

const viewDirectory = [
  { path: 'list', icon: <ListIcon />, tooltip: 'List view' },
  { path: 'board', icon: <AppsIcon />, tooltip: 'Board view' },
]

function parseView(value: unknown): InsightsView {
  return value === 'board' ? 'board' : 'list'
}

export function ClusterInsightsComponents() {
  const theme = useTheme()
  const { cluster, clusterLoading } = useClusterInsightsContext()
  const [priorityFilter, setPriorityFilter] =
    useState<InsightComponentPriority | null>(null)
  const [view, setView] = usePersistedState<InsightsView>(
    VIEW_STORAGE_KEY,
    'list',
    0,
    parseView
  )

  const { total, filteredComponents, counts } = useMemo(() => {
    const components =
      cluster?.insightComponents?.filter(componentHasInsight) ?? []
    return {
      total: components.length,
      filteredComponents: sortInsightComponents(
        components.filter(
          (component) =>
            !priorityFilter || component.priority === priorityFilter
        )
      ),
      counts: countBy(components, (component) => component.priority),
    }
  }, [cluster?.insightComponents, priorityFilter])
  const loading = !cluster && clusterLoading

  useSetNavigationContent(
    useMemo(
      () => (
        <StackedText
          first={
            <Flex
              gap="small"
              align="center"
              height={40}
            >
              <ComponentsIcon size={16} />
              <span>Component insights</span>
            </Flex>
          }
          firstPartialType="body2Bold"
          firstColor="text"
          second="Real-time visibility into the health, resources, and configuration of every application deployed."
          secondPartialType="body2"
          secondColor="text-light"
        />
      ),
      []
    )
  )

  useSetActionContent(
    useMemo(
      () => (
        <Flex>
          {priorityFilterValues.map((priorityName) => {
            const priorityValue = priorityName === 'All' ? null : priorityName

            return (
              <SubTab
                key={priorityName}
                active={priorityFilter === priorityValue}
                onClick={() => setPriorityFilter(priorityValue)}
              >
                {capitalize(priorityName)}{' '}
                <Chip
                  size="small"
                  severity={priorityToSeverity(priorityValue)}
                >
                  {priorityValue ? (counts[priorityValue] ?? 0) : total}
                </Chip>
              </SubTab>
            )
          })}
        </Flex>
      ),
      [counts, priorityFilter, total]
    )
  )

  // same place and look as the list/tree switch of the cluster services
  useSetPageHeaderContent(
    useMemo(
      () => (
        <ButtonGroup
          directory={viewDirectory}
          tab={view}
          onClick={(path) => setView(parseView(path))}
        />
      ),
      [view, setView]
    )
  )

  if (loading && view === 'list')
    return (
      <ClusterInsightComponentsTable
        loading
        components={[]}
      />
    )

  if (loading)
    return (
      <div
        css={{
          display: 'grid',
          gap: theme.spacing.xsmall,
          gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <RectangleSkeleton
            key={i}
            $height="xxxlarge"
            $width="100%"
          />
        ))}
      </div>
    )

  if (isEmpty(filteredComponents))
    return <EmptyState message="No insights found." />

  if (view === 'list')
    return <ClusterInsightComponentsTable components={filteredComponents} />

  return (
    <CardGrid
      styles={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
        gridAutoRows: 'min-content',
      }}
    >
      {filteredComponents.map((component) => (
        <ClusterInsightComponentCard
          key={component.id}
          component={component}
        />
      ))}
    </CardGrid>
  )
}

const priorityFilterValues: (InsightComponentPriority | 'All')[] = [
  'All',
  InsightComponentPriority.Critical,
  InsightComponentPriority.High,
  InsightComponentPriority.Medium,
  InsightComponentPriority.Low,
]
