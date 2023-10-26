import { Button, PersonIcon } from '@pluralsh/design-system'
import { ComponentProps, ReactNode, useState } from 'react'

import {
  ClusterFragment,
  ClustersRowFragment,
  useClusterBindingsQuery,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { PermissionsModal } from '../utils/PermissionsModal'

type Cluster = Pick<ClusterFragment, 'id' | 'name' | 'version'>

export function ClusterPermissionsModal({
  cluster,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'clusterId' | 'serviceId' | 'header'
> & {
  header?: ReactNode
  cluster: ClustersRowFragment
}) {
  const { data } = useClusterBindingsQuery({
    variables: { id: cluster.id },
    fetchPolicy: 'no-cache',
    skip: !cluster.id || !props.open,
  })
  const bindings = data?.cluster

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header={header || `Cluster permissions – ${cluster.name}`}
      name={cluster.name}
      bindings={bindings}
      clusterId={cluster.id}
      {...props}
    />
  )
}

export default function ClusterPermissions({ cluster }: { cluster: Cluster }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        startIcon={<PersonIcon />}
        onClick={() => setIsOpen(true)}
      >
        Permissions
      </Button>
      <ModalMountTransition open={isOpen}>
        <ClusterPermissionsModal
          cluster={cluster}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
