import { Chip, Tooltip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import {
  StackPolicyViolation,
  VulnSeverity,
} from '../../../../generated/graphql.ts'
import { ColExpander } from '../../../cd/cluster/pod/PodContainers.tsx'
import { vulnSeverityToChipSeverity } from '../../../security/vulnerabilities/VulnReportDetailsTableCols.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import { TooltipTime } from '../../../utils/TooltipTime.tsx'

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
      gridTemplate: 'minmax(170px, .5fr)',
    },
    cell: ({ getValue }) => (
      <StackedText
        first={getValue()?.policyId}
        second={
          <TooltipTime
            date={getValue()?.updatedAt ?? getValue()?.insertedAt}
            prefix="Last seen:&nbsp;"
          >
            {dayjs(getValue()?.updatedAt ?? getValue()?.insertedAt).format(
              'MMM D, YYYY h:mm A'
            )}
          </TooltipTime>
        }
      />
    ),
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
]

export { columns }
