import { Chip, ErrorIcon, Tooltip } from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  useServiceDeploymentComponentsQuery,
} from 'generated/graphql'
import { ComponentProps, useMemo, useState } from 'react'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import pluralize from 'pluralize'

import { isNonNullable } from 'utils/isNonNullable'

import { ServiceDeprecationsModal } from './service/ServiceDeprecationsModal'
import { countDeprecations } from './service/deprecationUtils'

export function ServiceDeprecationsChip({
  deprecationCount,
  ...props
}: {
  deprecationCount: number
} & ComponentProps<typeof Chip>) {
  if (deprecationCount <= 0) {
    return null
  }

  return (
    <Tooltip label="View deprecations">
      <Chip
        severity="danger"
        icon={<ErrorIcon />}
        {...props}
      >
        {deprecationCount} {pluralize('deprecation', deprecationCount)}
      </Chip>
    </Tooltip>
  )
}

export function ServiceDeprecations({
  service,
}: {
  service: Nullable<
    Pick<ServiceDeploymentsRowFragment, 'name' | 'components' | 'id'>
  >
}) {
  const [open, setOpen] = useState(false)
  const deprecationCount = useMemo(
    () => countDeprecations(service?.components),
    [service?.components]
  )

  const { data } = useServiceDeploymentComponentsQuery({
    variables: { id: service?.id || '' },
    skip: !open || !service?.id,
  })

  const components = useMemo(
    () => data?.serviceDeployment?.components?.filter(isNonNullable),
    [data?.serviceDeployment?.components]
  )

  if (deprecationCount <= 0) {
    return null
  }

  const isOpen = open && !!components

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <ServiceDeprecationsChip
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        clickable
        deprecationCount={deprecationCount}
        css={{ width: 'max-content' }}
      />
      <ModalMountTransition open={isOpen}>
        <ServiceDeprecationsModal
          open={isOpen}
          onClose={() => setOpen(false)}
          components={components ?? []}
        />
      </ModalMountTransition>
    </div>
  )
}
