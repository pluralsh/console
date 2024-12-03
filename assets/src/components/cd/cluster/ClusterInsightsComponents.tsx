import {
  AiSparkleFilledIcon,
  ComponentsIcon,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { ClusterInsightComponent } from '../../../generated/graphql.ts'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData.tsx'

export default function ClusterInsightsComponents(): ReactNode {
  // const { cluster } = useClusterContext()
  const theme = useTheme()
  const data = [
    {
      id: 'id-1',
      name: 'plrl-agent-gate-operator-binding',
      namespace: 'plrl-deploy-operator',
      kind: 'ClusterRoleBinding',
      group: 'rbac.authorization.k8s.io',
      version: 'v1',
    } as ClusterInsightComponent,
    {
      id: 'id-2',
      name: 'kubernetes-dashboard',
      namespace: 'plrl-console',
      kind: 'Deployment',
      group: 'apps',
      version: 'v1',
    } as ClusterInsightComponent,
  ]

  return (
    <Table
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
    />
  )
}

const columnHelper = createColumnHelper<ClusterInsightComponent>()

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
        <Flex
          alignItems="center"
          gap="small"
          flex={1}
        >
          <IconFrame
            size="large"
            css={{ flexShrink: 0 }}
            icon={<ComponentsIcon />}
          />
          <StackedText
            first={
              <div>
                <span>{insight.namespace}</span>
                <span>&nbsp;&#62;&nbsp;</span>
                <span
                  css={{
                    color: theme.colors.text,
                    ...theme.partials.text.body2Bold,
                  }}
                >
                  {insight.name}
                </span>
              </div>
            }
            second={`${insight.group}/${insight.kind}`}
          ></StackedText>
        </Flex>
        <IconFrame icon={<AiSparkleFilledIcon color="icon-info" />} />
      </div>
    )
  },
})
