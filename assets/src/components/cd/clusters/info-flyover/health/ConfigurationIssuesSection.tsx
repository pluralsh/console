import { Chip, Flex, SubTab, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { ClusterInsightComponentLabel } from 'components/cd/cluster/ClusterInsightsComponents'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import {
  ClusterInsightComponentFragment,
  ClusterOverviewDetailsFragment,
  InsightComponentPriority,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CLUSTER_INSIGHTS_COMPONENTS_PATH,
  CLUSTER_INSIGHTS_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'
import { HealthScoreSection, IssuesEmptyState } from './HealthScoreTab'

const columnHelper = createColumnHelper<ClusterInsightComponentFragment>()

export function ConfigurationIssuesSection({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const navigate = useNavigate()
  const [priorityFilter, setPriorityFilter] =
    useState<InsightComponentPriority | null>(null)

  const components =
    cluster.insightComponents?.filter(
      (c): c is ClusterInsightComponentFragment => !!c?.insight
    ) ?? []

  const configurationIssues = components
    .filter((c) => !priorityFilter || c.priority === priorityFilter)
    .toSorted(comparePriority)

  return (
    <HealthScoreSection
      title={`Configuration issues (${configurationIssues.length})`}
      actions={
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
                  {components?.filter(
                    (c) => !priorityValue || c.priority === priorityValue
                  )?.length ?? 0}
                </Chip>
              </SubTab>
            )
          })}
        </Flex>
      }
    >
      {isEmpty(configurationIssues) ? (
        <IssuesEmptyState
          name={cluster.name}
          type="configuration"
        />
      ) : (
        <Table
          fullHeightWrap
          hideHeader
          rowBg="base"
          fillLevel={1}
          data={configurationIssues}
          columns={columns}
          onRowClick={(
            _e,
            { original }: Row<ClusterInsightComponentFragment>
          ) =>
            navigate(
              `${getClusterDetailsPath({ clusterId: cluster.id })}/${CLUSTER_INSIGHTS_PATH}/${CLUSTER_INSIGHTS_COMPONENTS_PATH}/${original.id}`
            )
          }
        />
      )}
    </HealthScoreSection>
  )
}

const columns = [
  columnHelper.accessor((component) => component, {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      return <ClusterInsightComponentLabel component={getValue()} />
    },
  }),
  columnHelper.accessor((component) => component.priority, {
    id: 'priority',
    cell: function Cell({ getValue }) {
      const priority = getValue() ?? InsightComponentPriority.Low
      return (
        <Chip
          size="large"
          severity={priorityToSeverity(priority)}
        >
          {capitalize(priority)}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((component) => component.insight, {
    id: 'insight',
    cell: function Cell({ getValue }) {
      return <AiInsightSummaryIcon insight={getValue()} />
    },
  }),
]

const priorityToSeverity = (priority: InsightComponentPriority | null) => {
  switch (priority) {
    case InsightComponentPriority.Low:
      return 'neutral'
    case InsightComponentPriority.Medium:
      return 'warning'
    case InsightComponentPriority.High:
      return 'danger'
    case InsightComponentPriority.Critical:
      return 'critical'
    default:
      return 'neutral'
  }
}
const priorityOrder: Record<InsightComponentPriority, number> = {
  [InsightComponentPriority.Critical]: 0,
  [InsightComponentPriority.High]: 1,
  [InsightComponentPriority.Medium]: 2,
  [InsightComponentPriority.Low]: 3,
}

const priorityFilterValues: (InsightComponentPriority | 'All')[] = [
  'All',
  ...Object.values(InsightComponentPriority).toSorted(
    (a, b) => priorityOrder[a] - priorityOrder[b]
  ),
]

const comparePriority = (
  a: ClusterInsightComponentFragment,
  b: ClusterInsightComponentFragment
) => {
  return (
    priorityOrder[a.priority ?? InsightComponentPriority.Low] -
    priorityOrder[b.priority ?? InsightComponentPriority.Low]
  )
}

export const componentHasInsight = (
  component: Nullable<ClusterInsightComponentFragment>
): component is ClusterInsightComponentFragment => {
  return !!component?.insight?.id
}
