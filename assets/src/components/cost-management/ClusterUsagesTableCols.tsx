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

const dollarize = (cost) => (cost ? `$${cost.toFixed(2)}` : '--')

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
          css={{ flexShrink: 0 }}
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

export const ColNodeCost = (
  columnHelper as ColumnHelper<ClusterUsageTinyFragment>
).accessor(({ nodeCost }) => nodeCost, {
  id: 'nodeCost',
  header: 'Node cost',
  cell: function Cell({ getValue }) {
    const nodeCost = getValue()

    return (
      <SimpleTextWrapperSC>
        {nodeCost ? `$${nodeCost.toFixed(2)}` : '--'}
      </SimpleTextWrapperSC>
    )
  },
})

export const ColCpuCost = columnHelper.accessor(({ cpuCost }) => cpuCost, {
  id: 'cpuCost',
  header: 'CPU cost',
  cell: function Cell({ getValue }) {
    const cpuCost = getValue()

    return (
      <SimpleTextWrapperSC>
        {cpuCost ? `$${cpuCost.toFixed(2)}` : '--'}
      </SimpleTextWrapperSC>
    )
  },
})

export const ColStorageCost = columnHelper.accessor(({ storage }) => storage, {
  id: 'storageCost',
  header: 'Storage cost',
  cell: function Cell({ getValue }) {
    const storage = getValue()

    return <SimpleTextWrapperSC>{dollarize(storage)}</SimpleTextWrapperSC>
  },
})

export const ColLoadBalancerCost = columnHelper.accessor(
  ({ loadBalancerCost }) => loadBalancerCost,
  {
    id: 'loadBalancerCost',
    header: 'Load balancer cost',
    cell: function Cell({ getValue }) {
      const loadBalancerCost = getValue()

      return (
        <SimpleTextWrapperSC>{dollarize(loadBalancerCost)}</SimpleTextWrapperSC>
      )
    },
  }
)

export const ColNetworkCost = columnHelper.accessor(
  ({ ingressCost, egressCost }) =>
    (ingressCost || egressCost) && { ingressCost, egressCost },
  {
    id: 'networkCost',
    header: 'Network cost',
    cell: function Cell({ row: { original } }) {
      const { ingressCost, egressCost } = original

      return (
        <SimpleTextWrapperSC>
          {dollarize(ingressCost)} / {dollarize(egressCost)}
        </SimpleTextWrapperSC>
      )
    },
  }
)

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
          {memoryCost ? `$${memoryCost.toFixed(2)}` : '--'}
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
