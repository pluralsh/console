import { Chip, ErrorIcon, Modal, Tooltip } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useState } from 'react'
import pluralize from 'pluralize'

import { ServiceDeploymentsRowFragment, ServiceError } from 'generated/graphql'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

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
        {errors?.length} {pluralize('error', errors?.length ?? 0)}
      </Chip>
    </Tooltip>
  )
}

export function ServiceErrorsModal({ isOpen, setIsOpen, header, errors }) {
  return (
    <ModalMountTransition open={isOpen}>
      <Modal
        portal
        size="large"
        header={header}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <ServiceErrorsTable errors={errors} />
      </Modal>
    </ModalMountTransition>
  )
}

export function ServicesTableErrors({
  service,
  ...props
}: {
  service: Nullable<Pick<ServiceDeploymentsRowFragment, 'name' | 'errors'>>
} & ChipProps) {
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
        {...props}
      />
      <ModalMountTransition open={isOpen}>
        <Modal
          portal
          size="large"
          header={`${service?.name} service errors`}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <ServiceErrorsTable errors={serviceErrors} />
        </Modal>
      </ModalMountTransition>
    </div>
  )
}
