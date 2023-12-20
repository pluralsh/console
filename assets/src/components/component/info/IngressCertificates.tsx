import { Chip, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { CertificateFragment } from 'generated/graphql'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'

import { InfoSectionH3 } from './common'

const columnHelper = createColumnHelper<CertificateFragment>()

const ColName = columnHelper.accessor((row) => row.metadata?.name, {
  id: 'name',
  header: 'Name',
  meta: { gridTemplate: 'minmax(max-content, 1fr)' },
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

/** Map condtion type to Chip severity */
export const toSeverity = {
  ready: 'success',
  unhealthy: 'danger',
} as const satisfies Record<string, ComponentProps<typeof Chip>['severity']>

const ColStatus = columnHelper.accessor(
  (row) =>
    row?.status?.conditions?.find?.((c) => c?.type?.toLowerCase() === 'ready')
      ?.status,
  {
    id: 'status',
    header: 'Status',
    meta: { gridTemplate: 'minmax(max-content, 1fr)' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const status = getValue()?.toLowerCase()

      return (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <Chip
            severity={
              status === 'true'
                ? 'success'
                : status === 'false'
                ? 'danger'
                : 'neutral'
            }
          >
            {status === 'true'
              ? 'Ready'
              : status === 'false'
              ? 'Unhealthy'
              : 'Unknown'}
          </Chip>
        </div>
      )
    },
  }
)

const ColStatusMessage = columnHelper.accessor(
  (row) =>
    row?.status?.conditions?.find?.((c) => c?.type?.toLowerCase() === 'ready')
      ?.message,
  {
    id: 'statusMsg',
    header: 'Status message',
    meta: { gridTemplate: 'minmax(max-content, 1fr)' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const message = getValue()

      return (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          {message && <p>{message}</p>}
        </div>
      )
    },
  }
)

const columns = [ColName, ColStatus, ColStatusMessage]

function CertificatesTable({
  certificates,
  ...props
}: {
  certificates: Nullable<CertificateFragment>[]
} & Omit<ComponentProps<typeof Table>, 'columns' | 'data'>) {
  return (
    <Table
      columns={columns}
      data={certificates}
      reactTableOptions={{
        getRowId: (r) => r.metadata.name,
      }}
      {...props}
    />
  )
}

export default function IngressCertificates({
  certificates,
}: {
  certificates: Nullable<Nullable<CertificateFragment>[]>
}) {
  const theme = useTheme()

  if (!certificates) {
    return null
  }

  return (
    <>
      <InfoSectionH3
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Certificates
      </InfoSectionH3>
      <CertificatesTable certificates={certificates} />
    </>
  )
}
