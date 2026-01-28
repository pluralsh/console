import { Chip, ChipProps, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { VulnerabilityFragment, VulnSeverity } from 'generated/graphql'
import { truncate } from 'lodash'
import { useTheme } from 'styled-components'

const columnHelper = createColumnHelper<VulnerabilityFragment>()

export const ColID = columnHelper.accessor((report) => report, {
  id: 'id',
  header: 'ID',
  meta: { gridTemplate: 'max(30%)', truncate: true },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const report = getValue()
    if (!report?.primaryLink) return '--'
    return (
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
        {report?.title}
      </a>
    )
  },
})

export const ColPackage = columnHelper.accessor((report) => report?.resource, {
  id: 'package',
  header: 'Package',
  enableSorting: true,
})

export const ColInstalledVersion = columnHelper.accessor(
  (report) => report?.installedVersion,
  {
    id: 'installedVersion',
    header: 'Version',
    enableSorting: true,
    cell: function Cell({ getValue }) {
      return <TruncatedVersionCell version={getValue() ?? ''} />
    },
  }
)

export const ColFixedVersion = columnHelper.accessor(
  (report) => report?.fixedVersion,
  {
    id: 'fixedVersion',
    header: 'Fixed version(s)',
    enableSorting: true,
    cell: function Cell({ getValue }) {
      return <TruncatedVersionCell version={getValue() ?? ''} />
    },
  }
)

function TruncatedVersionCell({ version }: { version: string }) {
  return (
    <WrapWithIf
      condition={version?.length > 20}
      wrapper={
        <Tooltip
          placement="top"
          label={version}
        />
      }
    >
      <span css={{ wordBreak: 'break-all' }}>
        {truncate(version, { length: 20 })}
      </span>
    </WrapWithIf>
  )
}

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
