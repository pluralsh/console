import { Chip, Code, Table, Tooltip } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { DateTimeCol } from 'components/utils/table/DateTimeCol.tsx'
import { ReactNode } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  StackPolicyViolation,
  VulnSeverity,
} from '../../../../generated/graphql.ts'
import { ColExpander } from '../../../cd/cluster/pod/PodContainers.tsx'
import { vulnSeverityToChipSeverity } from '../../../security/vulnerabilities/VulnReportDetailsTableCols.tsx'
import { SubTitle } from '../../../utils/SubTitle.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../../utils/table/useFetchPaginatedData.tsx'
import { InlineLink } from '../../../utils/typography/InlineLink.tsx'
import { StackRunOutletContextT } from '../Route.tsx'

const columnHelper = createColumnHelper<StackPolicyViolation>()

const columns = [
  ColExpander,
  columnHelper.accessor((violation) => violation, {
    id: 'id',
    header: 'ID',
    enableSorting: true,
    sortingFn: 'basic',
    meta: {
      truncate: true,
      gridTemplate: 'minmax(150px, .5fr)',
    },
    cell: ({ getValue }) => getValue()?.policyId,
  }),
  columnHelper.accessor((violation) => violation, {
    id: 'title',
    header: 'Title',
    meta: { truncate: true, gridTemplate: 'minmax(150px, 1fr)' },
    cell: ({ getValue }) => getValue()?.title,
  }),
  columnHelper.accessor((violation) => violation, {
    id: 'module',
    header: 'Module',
    meta: { truncate: true, gridTemplate: 'minmax(150px, 1fr)' },
    cell: ({ getValue }) => {
      const module = getValue()?.policyModule
      return (
        <Tooltip
          placement="top-start"
          label={module}
        >
          <div
            css={{
              direction: 'rtl',
              textAlign: 'left',
            }}
          >
            {module}
          </div>
        </Tooltip>
      )
    },
  }),
  columnHelper.accessor((violation) => violation, {
    id: 'severity',
    header: 'Severity',
    enableSorting: true,
    sortingFn: (rowA, rowB, colId): number => {
      const severityToPriority: Record<VulnSeverity, number> = {
        [VulnSeverity.Critical]: 0,
        [VulnSeverity.High]: 1,
        [VulnSeverity.Medium]: 2,
        [VulnSeverity.Low]: 3,
        [VulnSeverity.Unknown]: 4,
        [VulnSeverity.None]: 4,
      }

      const first =
        severityToPriority[
          rowA.getValue<StackPolicyViolation>(colId)?.severity
        ] ?? 0
      const second =
        severityToPriority[
          rowB.getValue<StackPolicyViolation>(colId)?.severity
        ] ?? 0
      return first == second ? 0 : first < second ? -1 : 1
    },
    cell: ({ getValue }) => {
      const severity = getValue()?.severity
      return (
        <Chip severity={vulnSeverityToChipSeverity[severity ?? 'Unknown']}>
          {severity}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((violation) => violation, {
    id: 'updated',
    header: 'Last seen',
    meta: { truncate: true, gridTemplate: 'minmax(150px, .5fr)' },
    cell: ({ getValue }) => (
      <DateTimeCol date={getValue()?.updatedAt ?? getValue()?.insertedAt} />
    ),
  }),
]

export default function Violations(): ReactNode {
  const { stackRun } = useOutletContext<StackRunOutletContextT>()

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      css={{ maxHeight: '100%' }}
      data={stackRun?.violations || []}
      columns={columns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      getRowCanExpand={() => true}
      renderExpanded={ViolationExpansionPanel}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      emptyStateProps={{ message: 'No violations found.' }}
    />
  )
}

function ViolationExpansionPanel({
  row,
}: {
  row: Row<StackPolicyViolation>
}): ReactNode {
  const violation = row.original
  const policyUrl = violation.policyUrl ?? 'N/A'

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <SubTitle
        css={{
          marginBottom: 0,
        }}
      >
        Violation Details
      </SubTitle>
      <div
        css={{
          display: 'grid',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <StackedText
          first="Description"
          second={violation.description}
        ></StackedText>
        <StackedText
          first="Policy URL"
          second={
            policyUrl === 'N/A' ? (
              policyUrl
            ) : (
              <InlineLink
                href={policyUrl}
                target="_blank"
              >
                {violation.policyUrl}
              </InlineLink>
            )
          }
        />
        <StackedText
          first="Resolution"
          second={violation.resolution}
        />
      </div>
      {(violation?.causes?.length ?? 0) > 0 && (
        <div>
          <SubTitle>Causes</SubTitle>
          <span>
            The code below shows the lines of code that caused the security
            violation.
          </span>
          {violation?.causes?.map((v) => {
            const firstLine = v?.lines?.find((l) => l?.first)?.line ?? 0
            const lastLine = v?.lines?.find((l) => l?.last)?.line ?? 0

            return (
              <div>
                <Code language="terraform">
                  {v?.lines
                    ?.map((l) => {
                      const isEmpty = l?.content == 'N/A'
                      const firstChar = l?.first ? '┌' : ''
                      const lastChar = l?.last ? '└' : ''
                      const line = l?.line ?? 0
                      const midChar =
                        line > firstLine && line < lastLine ? '│' : ''

                      return `${isEmpty ? '..' : l?.line} ${firstChar}${midChar}${lastChar} ${isEmpty ? '' : l?.content}`
                    })
                    .join('\n')}
                </Code>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
