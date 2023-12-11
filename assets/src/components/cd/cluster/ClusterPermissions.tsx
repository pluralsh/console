import { IconFrame, PeopleIcon } from '@pluralsh/design-system'
import { ComponentProps, ReactNode, useState } from 'react'

import {
  ClusterFragment,
  ClustersRowFragment,
  useClusterBindingsQuery,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { PermissionsModal } from '../utils/PermissionsModal'

type Cluster = Pick<ClusterFragment, 'id' | 'name' | 'version'>

function ClusterPermissionsModalInner({
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

export function ClusterPermissionsModal(
  props: ComponentProps<typeof ClusterPermissionsModalInner>
) {
  return (
    <ModalMountTransition open={props.open}>
      <ClusterPermissionsModalInner {...props} />
    </ModalMountTransition>
  )
}
export default function ClusterPermissions({ cluster }: { cluster: Cluster }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <IconFrame
        type="secondary"
        size="large"
        tooltip="Cluster permissions"
        clickable
        icon={<PeopleIcon />}
        onClick={() => setIsOpen(true)}
      />
      <ClusterPermissionsModal
        cluster={cluster}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
