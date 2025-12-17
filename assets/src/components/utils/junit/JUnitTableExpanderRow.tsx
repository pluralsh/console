import { Accordion, AccordionItem, Flex } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { TestCase, TestSuite } from 'utils/junitParse'
import { StackedText } from '../table/StackedText'
import { JUnitPropertiesTable } from './JUnitTable'

export function JUnitTableExpanderRow({ row }: { row: Row<TestSuite> }) {
  const { properties, testcase } = row.original
  return (
    <Flex
      direction="column"
      gap="large"
    >
      {properties && <JUnitPropertiesTable properties={properties} />}
      {testcase?.map((test, i) => (
        <JUnitTestCaseAccordion
          key={test.name ?? i}
          testcase={test}
        />
      ))}
    </Flex>
  )
}

function JUnitTestCaseAccordion({ testcase }: { testcase: TestCase }) {
  // TODO maybe not openable if no data/test passed
  return (
    <Accordion
      type="single"
      fillLevel={0}
    >
      <AccordionItem
        trigger={
          <StackedText
            first={testcase.name}
            second={`${testcase.time}s`}
          />
        }
        caret="left"
      >
        {JSON.stringify(testcase)}
      </AccordionItem>
    </Accordion>
  )
}
