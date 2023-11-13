import { EmptyState, Modal, Table } from '@pluralsh/design-system'
import { ComponentProps, useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import { ServiceDeploymentComponentFragment } from 'generated/graphql'
import { deprecationsColumns } from 'components/cd/clusters/deprecationsColumns'

import { collectDeprecations } from './deprecationUtils'

export function ServiceDeprecationsModal({
  components,
  ...props
}: {
  components: ServiceDeploymentComponentFragment[]
} & ComponentProps<typeof Modal>) {
  const deprecations =
    useMemo(() => collectDeprecations(components), [components]) || []

  return (
    <Modal
      header="Deprecated Resources"
      size="large"
      maxWidth={1024}
      width={1024}
      portal
      {...props}
    >
      {isEmpty(deprecations) ? (
        <EmptyState message="No deprecated resources" />
      ) : (
        <Table
          data={deprecations || []}
          columns={deprecationsColumns}
          css={{
            maxHeight: 500,
            height: '100%',
          }}
        />
      )}
    </Modal>
  )
}
