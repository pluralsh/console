import { useState } from 'react'
import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'
import { QueryHookOptions } from '@apollo/client/react/types/types'

import { Confirm } from '../../utils/Confirm'
import { useNamespacedResourceDeleteMutation } from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { Resource } from './types'

interface DeleteResourceProps {
  resource: Resource
  refetch?: Nullable<
    (variables?: Partial<QueryHookOptions>) => Promise<unknown>
  >
}

export default function DeleteResource({
  resource,
  refetch,
}: DeleteResourceProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { clusterId } = useParams()
  const name = resource?.objectMeta?.name ?? ''
  const namespace = resource?.objectMeta?.namespace ?? ''
  const kind = resource?.typeMeta?.kind ?? ''

  const [mutation, { error }] = useNamespacedResourceDeleteMutation({
    client: KubernetesClient(clusterId ?? ''),
    variables: {
      name,
      namespace,
      kind,
    },
    onError: () => setDeleting(false),
    onCompleted: () =>
      refetch?.({
        fetchPolicy: 'no-cache',
      })
        .then(() => setOpen(false))
        .finally(() => setDeleting(false)),
  })

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <IconFrame
        clickable
        icon={<TrashCanIcon color="icon-danger" />}
        onClick={() => setOpen(true)}
        textValue="Delete"
        tooltip
      />
      {open && (
        <Confirm
          close={() => setOpen(false)}
          destructive
          label="Delete"
          loading={deleting}
          error={error}
          errorMessage="Could not delete resource"
          errorHeader="Something went wrong"
          open={open}
          submit={() => {
            setDeleting(true)
            mutation()
          }}
          title={`Delete ${kind}`}
          text={`The ${kind} "${name}"${
            namespace ? ` in namespace "${namespace}"` : ''
          } will be deleted.`}
        />
      )}
    </div>
  )
}
