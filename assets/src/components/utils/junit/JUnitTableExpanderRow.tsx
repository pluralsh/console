import { Flex } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { TestSuite } from 'utils/junitParse'
import { JUnitPropertiesTable } from './JUnitTable'

export function JUnitTableExpanderRow({ row }: { row: Row<TestSuite> }) {
  const { properties } = row.original
  return (
    <Flex
      direction="column"
      gap="large"
    >
      {properties && <JUnitPropertiesTable properties={properties} />}
    </Flex>
  )
}
