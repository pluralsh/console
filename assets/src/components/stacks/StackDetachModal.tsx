import { useNavigate } from 'react-router-dom'

import { Confirm } from '../utils/Confirm'
import { StackFragment, useDetachStackMutation } from '../../generated/graphql'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'

export default function StackDetachModal({
  stack,
  refetch,
  open,
  onClose,
}: {
  stack: StackFragment
  refetch: any
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()

  const [mutation, { loading, error }] = useDetachStackMutation({
    variables: { id: stack.id ?? '' },
    onCompleted: () => {
      refetch().then(() => navigate(getStacksAbsPath('')))
      onClose()
    },
  })

  return (
    <Confirm
      open={open}
      title="Detach stack"
      text={`Are you sure you want to detach ${stack.name} stack?`}
      close={onClose}
      confirmationEnabled
      confirmationText={stack.name}
      submit={() => mutation()}
      label="Detach"
      loading={loading}
      destructive
      error={error}
    />
  )
}
