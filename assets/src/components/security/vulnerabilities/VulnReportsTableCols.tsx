import {
  Chip,
  ChipProps,
  Flex,
  semanticColorCssVars,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { TableCaretLink } from 'components/cluster/TableElements'
import { VulnerabilityReportTinyFragment } from 'generated/graphql'
import { getVulnerabilityReportDetailsPath } from 'routes/securityRoutesConsts'
import { useTheme } from 'styled-components'
import { Edge } from 'utils/graphql'
import { gradeToSeverityMap } from './VulnReports'
import { useParams } from 'react-router-dom'

const columnHelper = createColumnHelper<Edge<VulnerabilityReportTinyFragment>>()

export const ColImage = columnHelper.accessor(({ node }) => node, {
  id: 'image',
  header: 'Image',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const report = getValue()

    return report?.artifactUrl ? (
      <a
        href={
          report?.artifactUrl?.startsWith('http')
            ? report.artifactUrl
            : `https://${report?.artifactUrl}`
        }
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        css={{ color: theme.colors['action-link-inline'] }}
      >
        {report?.artifactUrl}
      </a>
    ) : (
      '--'
    )
  },
})

export const ColNamespaces = columnHelper.accessor(
  ({ node }) => node?.namespaces,
  {
    id: 'namespaces',
    header: 'Namespace(s)',
    meta: { truncate: true },
    cell: function Cell({ getValue }) {
      const namespaces = getValue()

      return <span>{namespaces?.map((ns) => ns?.namespace).join(', ')}</span>
    },
  }
)

export const ColServices = columnHelper.accessor(({ node }) => node?.services, {
  id: 'services',
  header: 'Service(s)',
  meta: { truncate: true, gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const services = getValue()

    return <span>{services?.map((s) => s?.service?.name).join(', ')}</span>
  },
})

export const ColGrade = columnHelper.accessor(({ node }) => node?.summary, {
  id: 'grade',
  header: 'Grade',
  cell: function Cell({ getValue }) {
    const summary = getValue()
    let grade = 'A'
    if (summary?.criticalCount) grade = 'F'
    else if (summary?.highCount) grade = 'D'
    else if (summary?.mediumCount) grade = 'C'
    else if (summary?.lowCount) grade = 'B'
    return <Chip severity={gradeToSeverityMap[grade]}>{grade}</Chip>
  },
})

function SummaryChip({
  count,
  severity,
}: {
  count: number
  severity: ChipProps['severity']
}) {
  const theme = useTheme()
  return (
    <Chip
      css={{
        backgroundColor: count ? theme.colors['fill-two'] : 'transparent',
      }}
      severity={count ? severity : 'neutral'}
    >
      <span css={{ color: count ? undefined : theme.colors['text-xlight'] }}>
        {count}
      </span>
    </Chip>
  )
}

export const ColSummary = columnHelper.accessor(({ node }) => node?.summary, {
  id: 'summary',
  header: 'Summary',
  meta: {
    // @ts-ignore, need to update this type in DS to be ReactNode
    tooltip: (
      <div style={{ width: 240 }}>
        Displays the number of{' '}
        <strong style={{ color: semanticColorCssVars['icon-danger-critical'] }}>
          critical
        </strong>
        ,{' '}
        <strong style={{ color: semanticColorCssVars['icon-danger'] }}>
          high
        </strong>
        ,{' '}
        <strong style={{ color: semanticColorCssVars['icon-warning'] }}>
          medium
        </strong>
        , and{' '}
        <strong style={{ color: semanticColorCssVars['icon-neutral'] }}>
          low
        </strong>{' '}
        vulnerabilities found in the report.
      </div>
    ),
  },
  cell: function Cell({ getValue }) {
    const summary = getValue() as Nullable<
      VulnerabilityReportTinyFragment['summary']
    >
    return (
      <Flex gap="small">
        <SummaryChip
          count={summary?.criticalCount ?? 0}
          severity="critical"
        />
        <SummaryChip
          count={summary?.highCount ?? 0}
          severity="danger"
        />
        <SummaryChip
          count={summary?.mediumCount ?? 0}
          severity="warning"
        />
        <SummaryChip
          count={summary?.lowCount ?? 0}
          severity="neutral"
        />
      </Flex>
    )
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  meta: {
    gridTemplate: 'minmax(auto, 80px)',
  },
  cell: function Cell({ row: { original } }) {
    const { clusterId = '' } = useParams()
    const vulnerabilityReportId = original?.node?.id ?? ''
    return (
      <TableCaretLink
        css={{ alignSelf: 'end' }}
        to={getVulnerabilityReportDetailsPath({
          clusterId,
          vulnerabilityReportId,
        })}
        textValue={`View details`}
      />
    )
  },
})
