import { Chip, ErrorIcon, Modal, Tooltip } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useState } from 'react'

import { ServiceDeploymentsRowFragment, ServiceError } from 'generated/graphql'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { ServiceErrorsTable } from './service/ServiceErrors'

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
        severity="danger"
        icon={<ErrorIcon />}
        {...props}
      >
        {errors?.length} errors
      </Chip>
    </Tooltip>
  )
}

export function ServicesTableErrors({
  service,
}: {
  service: Nullable<
    Pick<ServiceDeploymentsRowFragment, 'name' | 'errors' | 'components'>
  >
}) {
  const [isOpen, setIsOpen] = useState(false)
  const serviceErrors = service?.errors

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
          <ServiceErrorsTable errors={serviceErrors} />
        </Modal>
      </ModalMountTransition>
    </div>
  )
}
