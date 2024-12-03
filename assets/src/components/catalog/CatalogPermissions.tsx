import { ComponentProps, ReactNode } from 'react'
import {
  PermissionsIdType,
  PermissionsModal,
} from '../cd/utils/PermissionsModal.tsx'
import {
  CatalogFragment,
  useCatalogBindingsQuery,
} from '../../generated/graphql.ts'
import { ModalMountTransition } from '../utils/ModalMountTransition.tsx'

function CatalogPermissionsModal({
  catalog,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'id' | 'type' | 'header'
> & {
  catalog: CatalogFragment
  header?: ReactNode
}) {
  const { data, refetch } = useCatalogBindingsQuery({
    variables: { id: catalog.id },
    fetchPolicy: 'no-cache',
    skip: !catalog.id || !props.open,
  })

  const bindings = data?.catalog

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header={header || `Catalog permissions - ${catalog.name}`}
      name={catalog.name}
      bindings={bindings}
      id={catalog.id}
      type={PermissionsIdType.Pipeline} // FIXME
      refetch={refetch}
      {...props}
    />
  )
}

export function CatalogPermissions(
  props: ComponentProps<typeof CatalogPermissionsModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <CatalogPermissionsModal {...props} />
    </ModalMountTransition>
  )
}
