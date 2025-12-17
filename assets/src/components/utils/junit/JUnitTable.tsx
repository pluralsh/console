import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { Property, TestSuite, TestSuites } from 'utils/junitParse'
import { StackedText } from '../table/StackedText'
import { JUnitTableExpanderRow } from './JUnitTableExpanderRow'

export function JUnitTable({ testSuites }: { testSuites: TestSuites }) {
  return (
    <Table
      hideHeader
      fillLevel={1}
      data={testSuites.testsuite ?? []}
      columns={cols}
      getRowCanExpand={() => true}
      renderExpanded={JUnitTableExpanderRow}
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
  propertyColumnHelper.accessor((property) => property, {
    id: 'properties',
    header: 'Properties',
  }),
  propertyColumnHelper.accessor((property) => property, {
    id: 'values',
    header: 'Values',
  }),
]
