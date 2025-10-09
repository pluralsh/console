import { Confirm } from '../utils/Confirm'
import { StackFragment, useDeleteStackMutation } from '../../generated/graphql'

export default function StackDeleteModal({
  stack,
  refetch,
  open,
  onClose,
}: {
  stack: StackFragment
  refetch?: Nullable<() => void>
  open: boolean
  onClose: () => void
}) {
  const deleting = !!stack.deletedAt

  const [mutation, { loading, error }] = useDeleteStackMutation({
    variables: { id: stack.id ?? '' },
    onCompleted: () => {
      refetch?.()
      onClose()
    },
  })

  return (
    <Confirm
      open={open}
      title={`${deleting ? 'Retry delete' : 'Delete'} stack`}
      text={`Are you sure you want to ${deleting ? 'retry' : ''} delete ${
        stack.name
      } stack?`}
      close={onClose}
      confirmationEnabled
      confirmationText={stack.name}
      submit={() => mutation()}
      label={deleting ? 'Retry delete' : 'Delete'}
      loading={loading}
      destructive
      error={error}
    />
  )
}
