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
  alwaysShow = false,
  ...props
}: {
  errors: Nullable<Nullable<ServiceError>[]>
  alwaysShow?: boolean
} & ComponentProps<typeof Chip>) {
  const hasErrors = !isEmpty(errors)

  if (!alwaysShow && !hasErrors) {
    return null
  }

  return (
    <Tooltip label="View errors">
      <Chip
        severity={hasErrors ? 'danger' : 'neutral'}
        icon={hasErrors ? <ErrorIcon /> : undefined}
        {...props}
      >
        {errors?.length === 0 ? 'No' : errors?.length}
        {pluralize(' error', errors?.length ?? 0)}
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
  alwaysShow = false,
  ...props
}: {
  service: Nullable<Pick<ServiceDeploymentsRowFragment, 'name' | 'errors'>>
  alwaysShow?: boolean
} & ChipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const serviceErrors = service?.errors

  if (!alwaysShow && (!serviceErrors || isEmpty(serviceErrors))) {
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
        alwaysShow={alwaysShow}
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
