import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { Property, TestSuite, TestSuites } from 'utils/junitParse'
import { StackedText } from '../table/StackedText'
import { JUnitTableExpanderRow } from './JUnitTableExpanderRow'
import styled from 'styled-components'

export function JUnitTable({ testSuites }: { testSuites: TestSuites }) {
  return (
    <Table
      hideHeader
      rowBg="base"
      fillLevel={1}
      data={testSuites.testsuite ?? []}
      columns={cols}
      getRowCanExpand={() => true}
      renderExpanded={JUnitTableExpanderRow}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      expandedBgColor="fill-zero"
    />
  )
}

export function JUnitPropertiesTable({
  properties,
}: {
  properties: Property[]
}) {
  return (
    <Table
      fillLevel={1}
      rowBg="base"
      padCells={false}
      data={properties}
      columns={propertyCols}
    />
  )
}

const columnHelper = createColumnHelper<TestSuite>()

const cols = [
  ColExpander,
  columnHelper.accessor((suite) => suite, {
    id: 'suite',
    cell: function Cell({ getValue }) {
      const { name, time } = getValue()
      return (
        <StackedText
          first={name}
          second={`${time}s`}
        />
      )
    },
  }),
]

const propertyColumnHelper = createColumnHelper<Property>()
const propertyCols = [
  propertyColumnHelper.accessor((property) => property.name, {
    id: 'properties',
    header: 'Properties',
    cell: function Cell({ getValue }) {
      return <PaddedCellSC>{getValue()}</PaddedCellSC>
    },
  }),
  propertyColumnHelper.accessor((property) => property.value, {
    id: 'values',
    header: 'Values',
    cell: function Cell({ getValue }) {
      return <PaddedCellSC>{getValue()}</PaddedCellSC>
    },
  }),
]
const PaddedCellSC = styled.div(({ theme }) => ({
  height: '100%',
  width: '100%',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  background: theme.colors['fill-zero'],
}))
