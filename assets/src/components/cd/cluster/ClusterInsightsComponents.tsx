import { ComponentsIcon, IconFrame, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ComponentPropsWithRef } from 'react'

import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { Body2BoldP } from 'components/utils/typography/Text.tsx'
import { ClusterInsightComponentFragment } from 'generated/graphql.ts'
import { Link } from 'react-router-dom'
import { AiInsightSummaryIcon } from '../../utils/AiInsights.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { componentHasInsight } from '../clusters/info-flyover/health/ConfigurationIssuesSection.tsx'
import { useClusterInsightsContext } from './ClusterInsights.tsx'

export function ClusterInsightsComponents() {
  const { cluster, clusterLoading } = useClusterInsightsContext()

  const data = cluster?.insightComponents?.filter(componentHasInsight) ?? []

  return (
    <Table
      hideHeader
      rowBg="base"
      fillLevel={1}
      fullHeightWrap
      virtualizeRows
      padCells={false}
      data={data}
      loading={!cluster && clusterLoading}
      columns={[TableRow]}
      emptyStateProps={{ message: 'No entries found.' }}
      getRowLink={({ original }) => (
        <Link to={(original as ClusterInsightComponentFragment).id} />
      )}
    />
  )
}

const columnHelper = createColumnHelper<ClusterInsightComponentFragment>()

const TableRow = columnHelper.accessor((item) => item, {
  id: 'row',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const insight = getValue()

    return (
      <StretchedFlex padding="medium">
        <ClusterInsightComponentLabel component={insight} />
        <AiInsightSummaryIcon insight={insight.insight} />
      </StretchedFlex>
    )
  },
})

export function ClusterInsightComponentLabel({
  component,
  icon = (
    <IconFrame
      size="large"
      icon={<ComponentsIcon />}
    />
  ),
  ...props
}: {
  component: Nullable<ClusterInsightComponentFragment>
} & Partial<ComponentPropsWithRef<typeof StackedText>>) {
  return (
    <StackedText
      firstColor="text-light"
      first={
        <div>
          {component?.namespace}
          <span>&nbsp;&#62;&nbsp;</span>
          <Body2BoldP
            as="span"
            $color="text"
          >
            {component?.name}
          </Body2BoldP>
        </div>
      }
      second={`${component?.group ?? component?.version ?? 'v1'}/${component?.kind}`}
      icon={icon}
      {...props}
    />
  )
}
