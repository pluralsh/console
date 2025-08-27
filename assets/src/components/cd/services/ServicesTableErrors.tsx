import {
  Chip,
  ChipProps,
  ErrorIcon,
  Modal,
  Tooltip,
  WarningIcon,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import pluralize from 'pluralize'
import { ComponentProps, useState } from 'react'

import {
  ServiceDeploymentsRowFragment,
  ServiceErrorFragment,
} from 'generated/graphql'

import { ServiceErrorsTable } from './service/ServiceErrors'

export function ServiceErrorsChip({
  errors,
  alwaysShow = false,
  ...props
}: {
  errors: Nullable<Nullable<ServiceErrorFragment>[]>
  alwaysShow?: boolean
} & ComponentProps<typeof Chip>) {
  const allWarnings =
    !isEmpty(errors) && !!errors?.every((error) => error?.warning)

  if (!alwaysShow && isEmpty(errors)) return null

  return (
    <Tooltip label="View errors">
      <Chip
        severity={
          isEmpty(errors) ? 'neutral' : allWarnings ? 'warning' : 'danger'
        }
        icon={
          isEmpty(errors) ? undefined : allWarnings ? (
            <WarningIcon />
          ) : (
            <ErrorIcon />
          )
        }
        {...props}
      >
        {errors?.length === 0 ? 'No' : errors?.length}
        {pluralize(allWarnings ? ' warning' : ' error', errors?.length ?? 0)}
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
