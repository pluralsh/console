import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { ProjectFragment, useProjectBindingsQuery } from 'generated/graphql'
import { ComponentProps, ReactNode } from 'react'

function ProjectPermissionsModalInner({
  project,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'id' | 'type' | 'header'
> & {
  project: ProjectFragment
  header?: ReactNode
}) {
  const { data, refetch } = useProjectBindingsQuery({
    variables: { id: project.id },
    fetchPolicy: 'no-cache',
    skip: !project.id || !props.open,
  })
  const bindings = data?.project

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      {...props}
      header={header || `Project permissions - ${project.name}`}
      name={project.name}
      bindings={bindings}
      id={project.id}
      type={PermissionsIdType.Project}
      refetch={refetch}
    />
  )
}

export function ProjectPermissionsModal(
  props: ComponentProps<typeof ProjectPermissionsModalInner>
) {
  return (
    <ModalMountTransition open={props.open}>
      <ProjectPermissionsModalInner {...props} />
    </ModalMountTransition>
  )
}
