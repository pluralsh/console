import { ComponentProps, ReactNode } from 'react'
import {
  ServiceDeploymentsRowFragment,
  useServiceDeploymentBindingsQuery,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { PermissionsIdType, PermissionsModal } from '../utils/PermissionsModal'

function ServicePermissionsModal({
  serviceDeployment,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'id' | 'type' | 'header'
> & {
  header?: ReactNode
  serviceDeployment: ServiceDeploymentsRowFragment
}) {
  const { data, refetch } = useServiceDeploymentBindingsQuery({
    variables: { id: serviceDeployment.id },
    fetchPolicy: 'no-cache',
    skip: !serviceDeployment.id || !props.open,
  })
  const bindings = data?.serviceDeployment

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header={header || `Service permissions - ${serviceDeployment.name}`}
      name={serviceDeployment.name}
      bindings={bindings}
      id={serviceDeployment.id}
      type={PermissionsIdType.Service}
      refetch={refetch}
      {...props}
    />
  )
}

export function ServicePermissions(
  props: ComponentProps<typeof ServicePermissionsModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <ServicePermissionsModal {...props} />
    </ModalMountTransition>
  )
}
