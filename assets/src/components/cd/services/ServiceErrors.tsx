import { Chip, ErrorIcon, Modal, Table, Tooltip } from '@pluralsh/design-system'
import { ServiceDeploymentsRowFragment, ServiceError } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

export function ServiceErrorsChip({
  errors,
  ...props
}: {
  errors: Nullable<Nullable<ServiceError>[]>
} & ComponentProps<typeof Chip>) {
  if (isEmpty(errors)) {
    return null
  }

  return (
    <Tooltip label="View errors">
      <Chip
        severity="error"
        icon={<ErrorIcon />}
        {...props}
      >
        {errors?.length} errors
      </Chip>
    </Tooltip>
  )
}

const columnHelper = createColumnHelper<Nullable<ServiceError>>()

export const ColSource = columnHelper.accessor((row) => row?.source, {
  id: 'source',
  header: 'Source',
  enableSorting: true,
  cell: ({ getValue }) => getValue(),
})

export const ColMessage = columnHelper.accessor((row) => row?.message, {
  id: 'message',
  header: 'Message',
  enableSorting: true,
  meta: { truncate: true },
  cell: ({ getValue }) => getValue(),
})
const columns = [ColSource, ColMessage]

export function ServiceErrors({
  service,
}: {
  service: Nullable<
    Pick<ServiceDeploymentsRowFragment, 'name' | 'errors' | 'components'>
  >
}) {
  const [isOpen, setIsOpen] = useState(false)

  const serviceErrors = service?.errors

  // const serviceErrors = [{message:'hi there', source:'Source'}]

  if (!serviceErrors || isEmpty(serviceErrors)) {
    return null
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <ServiceErrorsChip
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        clickable
        errors={serviceErrors}
      />
      <ModalMountTransition open={isOpen}>
        <Modal
          portal
          size="large"
          header={`Service errors${service?.name ? ` – ${service?.name}` : ''}`}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <Table
            data={serviceErrors}
            columns={columns}
            reactTableOptions={{
              getRowId(original, index) {
                return `${index}${original?.source}${original?.message}`
              },
            }}
          />
        </Modal>
      </ModalMountTransition>
    </div>
  )
}
