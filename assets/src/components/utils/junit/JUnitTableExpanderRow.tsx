import {
  Accordion,
  AccordionItem,
  CheckRoundedIcon,
  Code,
  FailedFilledIcon,
  Flex,
  IndeterminateOutlineIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { ReactElement } from 'react'
import { useTheme } from 'styled-components'
import { TestCase, TestcaseResult, TestSuite } from 'utils/junitParse'
import { StretchedFlex } from '../StretchedFlex'
import { StackedText } from '../table/StackedText'
import { JUnitPropertiesTable } from './JUnitPropertiesTable'

export enum JUnitTestStatus {
  Failed = 'FAILED',
  Error = 'ERROR',
  Passed = 'PASSED',
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
  const { spacing, borders } = useTheme()
  const status = getTestcaseStatus(testcase)
  const {
    name,
    time,
    properties,
    systemErr,
    systemOut,
    skipped,
    error,
    failure,
  } = testcase

  return (
    <Accordion
      type="single"
      fillLevel={0}
    >
      <AccordionItem
        paddedCaret
        trigger={
          <StretchedFlex>
            <StackedText
              first={name}
              firstPartialType="body1Bold"
              firstColor="text"
              second={`${time}s`}
              secondColor="text-light"
            />
            {testStatusToIcon(status)}
          </StretchedFlex>
        }
        caret="left"
        paddingArea="trigger-only"
        disabled={
          status === JUnitTestStatus.Passed &&
          !systemErr &&
          !systemOut &&
          !properties
        }
        additionalContentStyles={{
          borderTop: borders.default,
          padding: spacing.large,
        }}
      >
        <Flex
          direction="column"
          gap="small"
        >
          {properties && (
            <JUnitPropertiesTable
              cellBg="bright"
              properties={properties}
            />
          )}
          {systemErr && (
            <ExpanderCodeBlock title="system-err">
              {systemErr.join('\n')}
            </ExpanderCodeBlock>
          )}
          {systemOut && (
            <ExpanderCodeBlock title="system-out">
              {systemOut.join('\n')}
            </ExpanderCodeBlock>
          )}
          {skipped?.map((s, i) => (
            <ExpanderCodeBlock
              key={i}
              title="skipped message"
              resultObj={s}
            />
          ))}
          {error?.map((e, i) => (
            <ExpanderCodeBlock
              key={i}
              title="error"
              resultObj={e}
            />
          ))}
          {failure?.map((f, i) => (
            <ExpanderCodeBlock
              key={i}
              title="failure"
              resultObj={f}
            />
          ))}
        </Flex>
      </AccordionItem>
    </Accordion>
  )
}

function ExpanderCodeBlock({
  title,
  resultObj,
  children,
}: {
  title: string
} & (
  | { children: string; resultObj?: never }
  | { children?: never; resultObj: TestcaseResult }
)) {
  const { borders } = useTheme()
  let content = ''
  if (resultObj) {
    const { message, type, inner } = resultObj
    if (message) content += `message: ${message}\n`
    if (type) content += `type: ${type}\n`
    if (inner) content += `${inner}\n`
  } else content = children
  return (
    <Code
      fillLevel={0}
      showHeader
      title={title}
      css={{ border: borders['fill-two'] }}
    >
      {content}
    </Code>
  )
}

export const getTestcaseStatus = (testcase: TestCase): JUnitTestStatus => {
  if (!isEmpty(testcase.skipped)) return JUnitTestStatus.Skipped
  if (!isEmpty(testcase.error)) return JUnitTestStatus.Error
  if (!isEmpty(testcase.failure)) return JUnitTestStatus.Failed
  return JUnitTestStatus.Passed
}

export const testStatusToIcon = (
  status: JUnitTestStatus,
  size: number = 16
): ReactElement => {
  switch (status) {
    case JUnitTestStatus.Passed:
      return (
        <CheckRoundedIcon
          color="icon-success"
          size={size}
        />
      )
    case JUnitTestStatus.Failed:
      return (
        <FailedFilledIcon
          color="icon-danger"
          size={size}
        />
      )
    case JUnitTestStatus.Error:
      return (
        <WarningIcon
          color="icon-warning"
          size={size}
        />
      )
    case JUnitTestStatus.Skipped:
      return (
        <IndeterminateOutlineIcon
          color="icon-info"
          size={size}
        />
      )
  }
}
