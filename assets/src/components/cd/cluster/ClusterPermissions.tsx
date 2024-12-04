import { Button, PersonIcon, ModalWrapper } from '@pluralsh/design-system'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import {
  ClusterFragment,
  ClustersRowFragment,
  useClusterBindingsQuery,
} from 'generated/graphql'
import { ComponentProps, ReactNode, useState } from 'react'
import LoadingIndicator from '../../utils/LoadingIndicator.tsx'

import { PermissionsIdType, PermissionsModal } from '../utils/PermissionsModal'

type Cluster = Pick<ClusterFragment, 'id' | 'name' | 'version'>

function ClusterPermissionsModalInner({
  cluster,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'id' | 'type' | 'header'
> & {
  header?: ReactNode
  cluster: ClustersRowFragment
}) {
  const { data, refetch } = useClusterBindingsQuery({
    variables: { id: cluster.id },
    fetchPolicy: 'no-cache',
    skip: !cluster.id || !props.open,
  })
  const bindings = data?.cluster

  if (!bindings) {
    return (
      <ModalWrapper
        open={props.open}
        css={{ overflow: 'hidden' }}
      >
        <LoadingIndicator />
      </ModalWrapper>
    )
  }

  return (
    <PermissionsModal
      header={header || `Cluster permissions - ${cluster.name}`}
      name={cluster.name}
      bindings={bindings}
      id={cluster.id}
      type={PermissionsIdType.Cluster}
      refetch={refetch}
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
      <Button
        secondary
        startIcon={<PersonIcon />}
        onClick={() => setIsOpen(true)}
      >
        Permissions
      </Button>
      <ClusterPermissionsModal
        cluster={cluster}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
