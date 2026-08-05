import {
  Card,
  Chip,
  ChipSeverity,
  ComponentsIcon,
  EmptyState,
  Flex,
  IconFrame,
  SubTab,
} from '@pluralsh/design-system'
import { ComponentPropsWithRef, useMemo, useState } from 'react'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import {
  ClusterInsightComponentFragment,
  InsightComponentPriority,
} from 'generated/graphql.ts'
import { capitalize, countBy, isEmpty } from 'lodash'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { AiInsightSummaryIcon } from '../../utils/AiInsights.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { componentHasInsight } from '../clusters/info-flyover/health/ConfigurationIssuesSection.tsx'
import {
  useClusterInsightsContext,
  useSetActionContent,
  useSetNavigationContent,
} from './ClusterInsights.tsx'

export function ClusterInsightsComponents() {
  const theme = useTheme()
  const { cluster, clusterLoading } = useClusterInsightsContext()
  const [priorityFilter, setPriorityFilter] =
    useState<InsightComponentPriority | null>(null)

  const { total, filteredComponents, counts } = useMemo(() => {
    const components =
      cluster?.insightComponents?.filter(componentHasInsight) ?? []
    return {
      total: components.length,
      filteredComponents: components.filter(
        (component) => !priorityFilter || component.priority === priorityFilter
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

  if (!loading && isEmpty(filteredComponents))
    return <EmptyState message="No insights found." />

  return (
    <div
      css={{
        display: 'grid',
        gap: theme.spacing.xsmall,
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      }}
    >
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <RectangleSkeleton
              key={i}
              $height="xxxlarge"
              $width="100%"
            />
          ))
        : filteredComponents.map((component) => (
            <ComponentInsightCardSC
              key={component.id}
              clickable
              forwardedAs={Link}
              to={component.id}
            >
              <ClusterInsightComponentLabel
                truncate
                component={component}
                icon={
                  <IconFrame
                    size="medium"
                    icon={<ComponentsIcon size={16} />}
                  />
                }
                first={
                  <span>
                    {component.namespace && (
                      <span css={{ color: theme.colors['text-light'] }}>
                        {component.namespace} &gt;{' '}
                      </span>
                    )}
                    {component.name}
                  </span>
                }
                firstPartialType="body2"
                secondPartialType="caption"
              />
              <Flex
                gap="xsmall"
                align="center"
              >
                {component.priority && (
                  <Chip
                    size="small"
                    severity={priorityToSeverity(component.priority)}
                  >
                    {capitalize(component.priority)}
                  </Chip>
                )}
                <AiInsightSummaryIcon insight={component.insight} />
              </Flex>
            </ComponentInsightCardSC>
          ))}
    </div>
  )
}

export function ClusterInsightComponentLabel({
  component,
  icon = <ComponentsIcon size={16} />,
  ...props
}: {
  component: Nullable<ClusterInsightComponentFragment>
} & Partial<ComponentPropsWithRef<typeof StackedText>>) {
  const title = component?.namespace
    ? `${component.namespace} > ${component.name}`
    : component?.name

  return (
    <StackedText
      first={title}
      firstPartialType="body2Bold"
      firstColor="text"
      second={`${component?.group ?? component?.version ?? 'v1'}/${component?.kind}`}
      secondPartialType="body2"
      secondColor="text-light"
      icon={icon}
      iconGap="small"
      iconFlexProps={{ minWidth: 0 }}
      {...props}
    />
  )
}

function priorityToSeverity(
  priority: Nullable<InsightComponentPriority>
): ChipSeverity {
  switch (priority) {
    case InsightComponentPriority.Medium:
      return 'warning'
    case InsightComponentPriority.High:
      return 'danger'
    case InsightComponentPriority.Critical:
      return 'critical'
    case InsightComponentPriority.Low:
    default:
      return 'neutral'
  }
}

const priorityFilterValues: (InsightComponentPriority | 'All')[] = [
  'All',
  InsightComponentPriority.Critical,
  InsightComponentPriority.High,
  InsightComponentPriority.Medium,
  InsightComponentPriority.Low,
]

const ComponentInsightCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  gap: theme.spacing.xsmall,
  textDecoration: 'none',
  '&:any-link': { textDecoration: 'none' },
}))
