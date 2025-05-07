import {
  Chip,
  ErrorIcon,
  Modal,
  Tooltip,
  ChipProps,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useState } from 'react'
import pluralize from 'pluralize'

import { ServiceDeploymentsRowFragment, ServiceError } from 'generated/graphql'

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
    <Modal
      size="custom"
      header={header}
      open={isOpen}
      onClose={() => setIsOpen(false)}
      scrollable={false}
    >
      <ServiceErrorsTable errors={errors} />
    </Modal>
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
        css={{ minWidth: 'max-content' }}
        clickable
        errors={serviceErrors}
        alwaysShow={alwaysShow}
        {...props}
      />
      <ServiceErrorsModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        header={`${service?.name} service errors`}
        errors={serviceErrors}
      />
    </div>
  )
}
