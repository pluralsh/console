import { ArrowTopRightIcon, Chip, ChipProps } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { VulnerabilityFragment, VulnSeverity } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { VulnDetailExpanded } from './VulnDetailExpanded'

const columnHelper = createColumnHelper<VulnerabilityFragment>()

export const ColID = columnHelper.accessor((report) => report, {
  id: 'id',
  header: 'ID',
  meta: { gridTemplate: 'max(250px)' },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const report = getValue()

    return report?.primaryLink ? (
      <a
        onClick={(e) => e.stopPropagation()}
        href={
          report?.primaryLink?.startsWith('http')
            ? report.primaryLink
            : `https://${report?.primaryLink}`
        }
        target="_blank"
        rel="noopener noreferrer"
        css={{
          color: theme.colors['action-link-inline'],
          '&:hover': {
            color: theme.colors['action-link-inline-hover'],
          },
        }}
      >
        {report?.title} <ArrowTopRightIcon />
      </a>
    ) : (
      '--'
    )
  },
})

export const ColPackage = columnHelper.accessor((report) => report?.resource, {
  id: 'package',
  header: 'Package',
  enableSorting: true,
  cell: function Cell({ getValue }) {
    const pkg = getValue()

    return <span>{pkg}</span>
  },
})

export const ColInstalledVersion = columnHelper.accessor(
  (report) => report?.installedVersion,
  {
    id: 'installedVersion',
    header: 'Version',
    enableSorting: true,
    cell: function Cell({ getValue }) {
      const version = getValue()

      return <span>{version}</span>
    },
  }
)

export const ColFixedVersion = columnHelper.accessor(
  (report) => report?.fixedVersion,
  {
    id: 'fixedVersion',
    header: 'Fixed version',
    enableSorting: true,
    cell: function Cell({ getValue }) {
      const version = getValue()

      return <span>{version}</span>
    },
  }
)

export const vulnSeverityToChipSeverity: Record<
  VulnSeverity,
  ChipProps['severity']
> = {
  [VulnSeverity.Critical]: 'critical',
  [VulnSeverity.High]: 'danger',
  [VulnSeverity.Medium]: 'warning',
  [VulnSeverity.Low]: 'success',
  [VulnSeverity.Unknown]: 'neutral',
  [VulnSeverity.None]: 'neutral',
}

export const ColSeverity = columnHelper.accessor((report) => report?.severity, {
  id: 'severity',
  header: 'Severity',
  cell: function Cell({ getValue }) {
    const severity = getValue()
    return (
      <Chip severity={vulnSeverityToChipSeverity[severity ?? 'Unknown']}>
        {severity}
      </Chip>
    )
  },
})

export function VulnerabilityExpansionPanel({
  row,
}: {
  row: Row<VulnerabilityFragment>
}) {
  const { original: vulnerability } = row

  return (
    <div css={{ maxWidth: 920 }}>
      <VulnDetailExpanded v={vulnerability} />
    </div>
  )
}
