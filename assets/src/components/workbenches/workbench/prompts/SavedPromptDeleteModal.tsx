import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'
import {
  useDeleteWorkbenchPromptMutation,
  WorkbenchPromptFragment,
} from 'generated/graphql'
import { truncate } from 'lodash'

export function SavedPromptDeleteModal({
  open,
  savedPrompt,
  onClose,
}: {
  open: boolean
  savedPrompt: Nullable<WorkbenchPromptFragment>
  onClose: () => void
}) {
  const { popToast } = useSimpleToast()
  const [mutation, { loading, error }] = useDeleteWorkbenchPromptMutation({
    variables: { id: savedPrompt?.id ?? '' },
    onCompleted: () => {
      popToast({
        name: savedPrompt?.prompt ?? '',
        action: 'deleted',
        color: 'icon-danger',
      })
      onClose()
    },
    refetchQueries: ['WorkbenchPrompts'],
    awaitRefetchQueries: true,
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete saved prompt"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete saved prompt"
      text={
        <span>
          Are you sure you want to delete saved prompt{' '}
          <StrongSC $color="text-danger">
            {truncate(savedPrompt?.prompt ?? '', { length: 30 })}
          </StrongSC>
          ?
        </span>
      }
    />
  )
}
