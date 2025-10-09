import { ComponentsIcon, Flex, IconFrame, Table } from '@pluralsh/design-system'
import { createColumnHelper, type Row } from '@tanstack/react-table'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'

import { AiInsightSummaryIcon } from '../../utils/AiInsights.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { useClusterInsightsContext } from './ClusterInsights.tsx'
import { ClusterInsightComponentFragment } from 'generated/graphql.ts'
import { componentHasInsight } from '../clusters/info-flyover/health/ConfigurationIssuesSection.tsx'

export function ClusterInsightsComponents() {
  const { cluster } = useClusterInsightsContext()
  const theme = useTheme()
  const navigate = useNavigate()
  const data = cluster.insightComponents?.filter(componentHasInsight) ?? []

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      padCells={false}
      data={data}
      columns={[TableRow]}
      hideHeader
      css={{ height: '100%' }}
      border={theme.borders['fill-one']}
      overflowX={'hidden'}
      emptyStateProps={{ message: 'No entries found.' }}
      onRowClick={(_e, { original }: Row<ClusterInsightComponentFragment>) =>
        navigate(original.id)
      }
    />
  )
}

const columnHelper = createColumnHelper<ClusterInsightComponentFragment>()

const TableRow = columnHelper.accessor((item) => item, {
  id: 'row',
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const insight = getValue()

    return (
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xlarge,
          height: '100%',
          width: '100%',
          background: theme.colors['fill-one'],
          padding: theme.spacing.medium,
          '&:not(:has(button:hover)):not(:has(a:hover))': {
            '&:hover': {
              background: theme.colors['fill-two-selected'],
              cursor: 'pointer',
            },
          },
        }}
      >
        <ClusterInsightComponentLabel component={insight} />
        <AiInsightSummaryIcon insight={insight.insight} />
      </div>
    )
  },
})

export function ClusterInsightComponentLabel({
  component,
  icon = <ComponentsIcon />,
}: {
  component: Nullable<ClusterInsightComponentFragment>
  icon?: Nullable<ReactNode>
}): ReactNode {
  const theme = useTheme()

  return component ? (
    <Flex
      alignItems="center"
      gap="small"
      flex={1}
    >
      {icon && (
        <IconFrame
          size="large"
          css={{ flexShrink: 0 }}
          icon={<ComponentsIcon />}
        />
      )}
      <StackedText
        first={
          <div>
            <span
              css={{
                color: theme.colors['text-light'],
              }}
            >
              {component.namespace}
            </span>
            <span>&nbsp;&#62;&nbsp;</span>
            <span
              css={{
                color: theme.colors.text,
                ...theme.partials.text.body2Bold,
              }}
            >
              {component.name}
            </span>
          </div>
        }
        second={`${component.group ?? component.version ?? 'v1'}/${component.kind}`}
      />
    </Flex>
  ) : undefined
}
