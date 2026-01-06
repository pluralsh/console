import {
  Chip,
  ChipSeverity,
  Flex,
  SubTab,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { isEmpty } from 'lodash'
import pluralize from 'pluralize'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { TestSuite, TestSuites } from 'utils/junitParse'
import { StackedText } from '../table/StackedText'
import {
  getTestcaseStatus,
  JUnitTableExpanderRow,
  JUnitTestStatus,
  testStatusToIcon,
} from './JUnitTableExpanderRow'

type JUnitTableMeta = { selectedFilter: Nullable<JUnitTestStatus> }

export function JUnitTable({ testSuites }: { testSuites: TestSuites }) {
  const [selectedFilter, setSelectedFilter] =
    useState<Nullable<JUnitTestStatus>>(null)

  const filteredTestSuites = useMemo(
    () =>
      !selectedFilter
        ? (testSuites.testsuite ?? [])
        : (testSuites.testsuite
            ?.map((suite) => ({
              ...suite,
              testcase:
                suite.testcase?.filter(
                  (testcase) => getTestcaseStatus(testcase) === selectedFilter
                ) ?? [],
            }))
            .filter((suit) => !isEmpty(suit.testcase)) ?? []),
    [testSuites.testsuite, selectedFilter]
  )

  const meta: JUnitTableMeta = { selectedFilter }

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <Flex
        gap="xsmall"
        alignSelf="flex-end"
      >
        <FilterSubTabSC
          active={selectedFilter === null}
          onClick={() => setSelectedFilter(null)}
        >
          <span>All</span>
          <Chip size="small">{testSuites.tests}</Chip>
        </FilterSubTabSC>
        {Object.entries(JUnitTestStatus).map(([key, status]) => (
          <FilterSubTabSC
            key={key}
            active={selectedFilter === status}
            onClick={() => setSelectedFilter(status)}
          >
            {testStatusToIcon({ status })}
            <span>{key}</span>
            <Chip
              size="small"
              severity={testStatusToSeverity[status]}
            >
              {getCountFromStatus(testSuites, status)}
            </Chip>
          </FilterSubTabSC>
        ))}
      </Flex>
      <Table
        hideHeader
        rowBg="base"
        fillLevel={1}
        data={filteredTestSuites}
        columns={cols}
        getRowCanExpand={() => true}
        renderExpanded={JUnitTableExpanderRow}
        onRowClick={(_, row) => row.getToggleExpandedHandler()()}
        expandedBgColor="fill-zero"
        emptyStateProps={{ message: 'No tests found.' }}
        reactTableOptions={{ meta }}
      />
    </Flex>
  )
}

function JUnitStatusChip({
  value,
  status,
}: {
  value: number
  status: JUnitTestStatus
}) {
  return (
    <Tooltip
      placement="top"
      label={
        <span>
          <strong>{value}</strong> {pluralize('test', value)}{' '}
          {status.toLowerCase()}
        </span>
      }
    >
      <Chip
        clickable
        size="small"
        fillLevel={2}
        inactive={value === 0 ? 'keep-fill' : false}
        severity={testStatusToSeverity[status]}
      >
        <Flex
          gap="xsmall"
          align="center"
        >
          {testStatusToIcon({ status, inactive: value === 0 })}
          <span>{value}</span>
        </Flex>
      </Chip>
    </Tooltip>
  )
}

const columnHelper = createColumnHelper<TestSuite>()
const cols = [
  ColExpander,
  columnHelper.accessor((suite) => suite, {
    id: 'suite',
    meta: { gridTemplate: '1fr' },
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
  columnHelper.accessor((suite) => suite, {
    id: 'results',
    cell: function Cell({ getValue, table: { options } }) {
      const suite = getValue()
      const { selectedFilter } = options.meta as JUnitTableMeta
      const chips = useMemo(
        () =>
          Object.values(JUnitTestStatus)
            .map((status) => ({
              status,
              value: getCountFromStatus(suite, status),
            }))
            .filter(({ status }) =>
              selectedFilter ? status === selectedFilter : true
            ),
        [suite, selectedFilter]
      )
      return (
        <Flex gap="medium">
          {chips.map(({ value, status }) => (
            <JUnitStatusChip
              key={status}
              value={value}
              status={status}
            />
          ))}
        </Flex>
      )
    },
  }),
]

const FilterSubTabSC = styled(SubTab)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
}))

const testStatusToSeverity: Record<JUnitTestStatus, ChipSeverity> = {
  [JUnitTestStatus.Passed]: 'success',
  [JUnitTestStatus.Failed]: 'danger',
  [JUnitTestStatus.Error]: 'warning',
  [JUnitTestStatus.Skipped]: 'info',
}
const getCountFromStatus = (
  testSuites: TestSuites,
  status: JUnitTestStatus
) => {
  const { failures = 0, errors = 0, tests = 0, skipped = 0 } = testSuites
  if (status === JUnitTestStatus.Failed) return failures
  if (status === JUnitTestStatus.Error) return errors
  if (status === JUnitTestStatus.Skipped) return skipped
  if (status === JUnitTestStatus.Passed)
    return Math.max(0, tests - failures - errors - skipped)
  return 0
}
