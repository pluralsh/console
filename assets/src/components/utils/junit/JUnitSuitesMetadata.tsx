import { Flex, HistoryIcon, Card } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { TestSuites } from 'utils/junitParse'
import { StackedText } from '../table/StackedText'

export function JUnitSuitesMetadata({
  testSuites,
}: {
  testSuites: TestSuites
}) {
  return (
    <MetadataCardSC>
      <MetadataItem
        heading="Suites"
        value={testSuites.testsuite?.length ?? 0}
      />
      <MetadataItem
        heading="Total tests"
        value={testSuites.tests ?? 0}
      />
      <MetadataItem
        heading="Failures"
        value={testSuites.failures ?? 0}
      />
      <MetadataItem
        heading="Errors"
        value={testSuites.errors ?? 0}
      />
      <MetadataItem
        heading={
          <Flex
            gap="xsmall"
            align="center"
          >
            <HistoryIcon size={10} />
            <span>Time</span>
          </Flex>
        }
        value={`${testSuites.time ?? 0}s`}
      />
    </MetadataCardSC>
  )
}

function MetadataItem({
  heading,
  value,
}: {
  heading: ReactNode
  value: ReactNode
}) {
  return (
    <StackedText
      gap="xxsmall"
      first={heading}
      firstPartialType="caption"
      firstColor="text-xlight"
      second={value}
      secondPartialType="body2"
      secondColor="text"
    />
  )
}

const MetadataCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.large,
  background: 'transparent',
  display: 'flex',
  gap: theme.spacing.xxlarge,
}))
