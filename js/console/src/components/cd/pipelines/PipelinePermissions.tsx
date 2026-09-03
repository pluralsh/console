import { ComponentProps, ReactNode } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { PipelineFragment, usePipelineBindingsQuery } from 'generated/graphql'

import { PermissionsIdType, PermissionsModal } from '../utils/PermissionsModal'

type Pipeline = Pick<PipelineFragment, 'id' | 'name'>

function PipelinePermissionsModal({
  pipeline,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'id' | 'type' | 'header'
> & {
  pipeline: Pipeline
  header?: ReactNode
}) {
  const { data, refetch } = usePipelineBindingsQuery({
    variables: { id: pipeline.id },
    fetchPolicy: 'no-cache',
    skip: !pipeline.id || !props.open,
  })
  const bindings = data?.pipeline

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header={header || `Pipeline permissions - ${pipeline.name}`}
      name={pipeline.name}
      bindings={bindings}
      id={pipeline.id}
      type={PermissionsIdType.Pipeline}
      refetch={refetch}
      {...props}
    />
  )
}

export function PipelinePermissions(
  props: ComponentProps<typeof PipelinePermissionsModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <PipelinePermissionsModal {...props} />
    </ModalMountTransition>
  )
}
