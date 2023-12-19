import { EmptyState, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { CertificateFragment } from 'generated/graphql'
import { produce } from 'immer'
import { ComponentProps, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

const columnHelper = createColumnHelper<CertificateFragment>()

const fakeCert: CertificateFragment = {
  metadata: { name: 'Dummy certificate' },
  raw: 'raw text',
  status: { renewalTime: '????', notBefore: '????', notAfter: '????' },
  spec: { secretName: 'Secret name' },
}

const fakeCerts: CertificateFragment[] = new Array<CertificateFragment>(100)
  .fill(fakeCert)
  .map((c, i) =>
    produce(c, (d) => {
      d.metadata.name = `${d.metadata.name} ${i + 1}`
    })
  )

const ColName = columnHelper.accessor((row) => row.metadata?.name, {
  id: 'name',
  header: 'Name',
  meta: { gridTemplate: 'minmax(max-content, 1fr)' },
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const ColStatus = columnHelper.accessor((row) => row.status?.renewalTime, {
  id: 'status',
  header: 'Status',
  meta: { gridTemplate: 'minmax(max-content, 1fr)' },
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const ColSpec = columnHelper.accessor((row) => row.spec?.secretName, {
  id: 'spec',
  header: 'Secret',
  meta: { gridTemplate: 'minmax(max-content, 4fr)' },

  cell: function Cell({ getValue }) {
    return getValue()
  },
})
const columns = [ColName, ColStatus, ColSpec]

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
  const certificates =
    useMemo(
      () =>
        data
          ? (Object.values(data).find((value) => value !== undefined) as any)
              ?.certificates ?? null
          : null,
      [data]
    ) || fakeCerts

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
