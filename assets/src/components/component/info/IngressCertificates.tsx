import {
  ArrowTopRightIcon,
  Button,
  Chip,
  Flex,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { CertificateFragment } from 'generated/graphql'
import { ComponentProps, useState } from 'react'
import { useTheme } from 'styled-components'

import { useParams } from 'react-router-dom'
import { getCustomResourceDetailsAbsPath } from 'routes/kubernetesRoutesConsts.tsx'
import { RawYaml } from '../ComponentRaw.tsx'
import { InfoSectionH3 } from './common'

const columnHelper = createColumnHelper<CertificateFragment>()

const columns = [
  columnHelper.accessor((row) => row.metadata?.name, {
    id: 'name',
    header: 'Name',
    meta: { gridTemplate: 'minmax(max-content, 1fr)' },
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }),
  columnHelper.accessor(
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
  ),
  columnHelper.accessor(
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
  ),
  columnHelper.accessor((row) => row, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: 'max-content' },
    cell: function Cell({ getValue }) {
      const { clusterId = '' } = useParams()
      const certificate = getValue()
      const [open, setOpen] = useState(false)

      return (
        <>
          <Flex gap="small">
            <Button
              secondary
              onClick={() => setOpen(true)}
            >
              Raw
            </Button>
            <Button
              secondary
              endIcon={<ArrowTopRightIcon />}
              as="a"
              target="_blank"
              rel="noopener noreferrer"
              href={getCustomResourceDetailsAbsPath(
                clusterId,
                'certificates.cert-manager.io',
                certificate.metadata?.name,
                certificate.metadata?.namespace
              )}
            >
              View Certificate
            </Button>
          </Flex>
          <Modal
            header={`${certificate.metadata?.name} - Raw`}
            scrollable={false}
            size="auto"
            open={open}
            onClose={() => setOpen(false)}
          >
            <RawYaml raw={certificate.raw} />
          </Modal>
        </>
      )
    },
  }),
]

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
