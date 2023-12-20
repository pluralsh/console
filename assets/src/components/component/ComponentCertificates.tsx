import { Chip, EmptyState, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { CertificateFragment } from 'generated/graphql'
import { ComponentProps, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

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

export default function ComponentCertificates() {
  const { data } = useOutletContext<any>()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const certificates = useMemo(
    () =>
      data
        ? (Object.values(data).find((value) => value !== undefined) as any)
            ?.certificates ?? null
        : null,
    [data]
  )

  if (!certificates) {
    return <EmptyState message="This component has no certificates" />
  }

  return (
    <FullHeightTableWrap>
      <CertificatesTable
        certificates={certificates}
        css={{ maxHeight: '100%' }}
      />
    </FullHeightTableWrap>
  )
}
