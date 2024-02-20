import { useState } from 'react'

import { Confirm } from '../../utils/Confirm'
import {
  ObjectStore,
  useDeleteObjectStoreMutation,
} from '../../../generated/graphql'
import { DeleteIconButton } from '../../utils/IconButtons'

export function DeleteObjectStore({
  objectStore,
  refetch,
}: {
  objectStore: ObjectStore
  refetch: Nullable<() => void>
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteObjectStoreMutation({
    variables: { id: objectStore.id },
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Delete"
        loading={loading}
        error={error}
        open={confirm}
        submit={() => mutation()}
        title="Delete object store"
        text={`Are you sure you want to delete ${objectStore.name}?`}
      />
    </div>
  )
}
