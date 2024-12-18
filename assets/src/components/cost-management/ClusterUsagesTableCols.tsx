import {
  CaretRightIcon,
  ClusterIcon,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
import { ColumnHelper, createColumnHelper } from '@tanstack/react-table'
import {
  ClusterNamespaceUsageFragment,
  ClusterUsageTinyFragment,
} from 'generated/graphql'
import styled from 'styled-components'

const columnHelper = createColumnHelper<
  ClusterUsageTinyFragment | ClusterNamespaceUsageFragment
>()

export const ColCluster = (
  columnHelper as ColumnHelper<ClusterUsageTinyFragment>
).accessor(({ cluster }) => cluster?.name, {
  id: 'cluster',
  header: 'Cluster',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const name = getValue() ?? '--'

    return (
      <Flex
        gap="small"
        align="center"
      >
        <IconFrame
          icon={<ClusterIcon />}
          type="floating"
        />
        {name}
      </Flex>
    )
  },
})

export const ColNamespace = (
  columnHelper as ColumnHelper<ClusterNamespaceUsageFragment>
).accessor(({ namespace }) => namespace, {
  id: 'namespace',
  header: 'Namespace',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const namespace = getValue()

    return namespace
  },
})

export const ColCpuCost = columnHelper.accessor(({ cpuCost }) => cpuCost, {
  id: 'cpuCost',
  header: 'CPU cost',
  cell: function Cell({ getValue }) {
    const cpuCost = getValue()

    return (
      <SimpleTextWrapperSC>
        {cpuCost ? `$${cpuCost}` : '--'}
      </SimpleTextWrapperSC>
    )
  },
})

export const ColCpuEfficiency = columnHelper.accessor(
  (usage) => {
    const efficiency = (usage.cpuUtil ?? NaN) / (usage.cpu ?? NaN)
    return isNaN(efficiency) ? NaN : Math.round(efficiency * 100)
  },
  {
    id: 'cpuEfficiency',
    header: 'CPU efficiency',
    cell: function Cell({ getValue }) {
      const efficiency = getValue()

      return (
        <SimpleTextWrapperSC>
          {isNaN(efficiency) || efficiency === Infinity
            ? '--'
            : `${efficiency}%`}
        </SimpleTextWrapperSC>
      )
    },
  }
)

export const ColMemoryCost = columnHelper.accessor(
  ({ memoryCost }) => memoryCost,
  {
    id: 'memoryCost',
    header: 'Memory cost',
    cell: function Cell({ getValue }) {
      const memoryCost = getValue()

      return (
        <SimpleTextWrapperSC>
          {memoryCost ? `$${memoryCost}` : '--'}
        </SimpleTextWrapperSC>
      )
    },
  }
)

export const ColMemoryEfficiency = columnHelper.accessor(
  (usage) => {
    const efficiency = (usage.memUtil ?? NaN) / (usage.memory ?? NaN)
    return isNaN(efficiency) ? NaN : Math.round(efficiency * 100)
  },
  {
    id: 'memoryEfficiency',
    header: 'Memory efficiency',
    meta: { gridTemplate: 'auto' },
    cell: function Cell({ getValue }) {
      const efficiency = getValue()

      return (
        <SimpleTextWrapperSC>
          {isNaN(efficiency) || efficiency === Infinity
            ? '--'
            : `${efficiency}%`}
        </SimpleTextWrapperSC>
      )
    },
  }
)

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell() {
    return (
      <IconFrame
        clickable
        tooltip="Go to usage details"
        icon={<CaretRightIcon />}
      />
    )
  },
})

const SimpleTextWrapperSC = styled.span({
  textAlign: 'right',
  width: '100%',
})
