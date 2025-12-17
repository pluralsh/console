import { Accordion, AccordionItem, Flex } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { TestCase, TestSuite } from 'utils/junitParse'
import { StackedText } from '../table/StackedText'
import { JUnitPropertiesTable } from './JUnitTable'
import { isEmpty } from 'lodash'

enum TestCaseStatus {
  Passed = 'PASSED',
  Failed = 'FAILED',
  Error = 'ERROR',
  Skipped = 'SKIPPED',
}

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
  const status = getTestCaseStatus(testcase)
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
        disabled={status !== TestCaseStatus.Passed}
      >
        {JSON.stringify(testcase)}
      </AccordionItem>
    </Accordion>
  )
}

const getTestCaseStatus = (testcase: TestCase): TestCaseStatus => {
  if (!isEmpty(testcase.skipped)) return TestCaseStatus.Skipped
  if (!isEmpty(testcase.error)) return TestCaseStatus.Error
  if (!isEmpty(testcase.failure)) return TestCaseStatus.Failed
  return TestCaseStatus.Passed
}
