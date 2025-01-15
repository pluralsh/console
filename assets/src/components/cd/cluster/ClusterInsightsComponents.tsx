import { ComponentsIcon, Flex, IconFrame, Table } from '@pluralsh/design-system'
import { createColumnHelper, type Row } from '@tanstack/react-table'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import { ClusterInsightComponent as ClusterInsightComponentAPI } from '../../../generated/graphql.ts'
import { AiInsightSummaryIcon } from '../../utils/AiInsights.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData.tsx'
import { useClusterInsightsContext } from './ClusterInsights.tsx'

export default function ClusterInsightsComponents(): ReactNode {
  const { cluster } = useClusterInsightsContext()
  const theme = useTheme()
  const navigate = useNavigate()
  const data = cluster.insightComponents as Array<ClusterInsightComponentAPI>

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      padCells={false}
      data={data}
      columns={[TableRow]}
      hideHeader
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      css={{
        height: '100%',
        overflowX: 'hidden',
        border: theme.borders['fill-one'],
      }}
      emptyStateProps={{ message: 'No entries found.' }}
      onRowClick={(_e, { original }: Row<ClusterInsightComponentAPI>) =>
        navigate(original.id)
      }
    />
  )
}

const columnHelper = createColumnHelper<ClusterInsightComponentAPI>()

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
        <ComponentEntry component={insight} />
        <AiInsightSummaryIcon insight={insight.insight} />
      </div>
    )
  },
})

export function ComponentEntry({
  component,
  icon = <ComponentsIcon />,
}: {
  component: Nullable<ClusterInsightComponentAPI>
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
