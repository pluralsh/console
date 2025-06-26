import { Button, ListBoxItem, Modal, Select } from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { Body1BoldP } from 'components/utils/typography/Text'
import {
  PrStatus,
  PullRequestFragment,
  useUpdatePullRequestMutation,
} from 'generated/graphql'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'

function PrSettingsModalInner({
  pr,
  refetch,
  open,
  onClose,
}: {
  pr: PullRequestFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({
    status: pr.status,
  })

  const [mutation, { loading, error }] = useUpdatePullRequestMutation({
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  const onSubmit = (e) => {
    e.preventDefault()
    if (allowSubmit && state.status && pr.title) {
      mutation({
        variables: {
          id: pr.id,
          attributes: {
            title: pr.title,
            status: state.status,
          },
        },
      })
    }
  }

  if (!pr) {
    return null
  }
  const allowSubmit = hasUpdates

  return (
    <Modal
      asForm
      open={open}
      onClose={onClose}
      header={`Update PR - '${pr.title}'`}
      formProps={{ onSubmit }}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          <Button
            primary
            type="submit"
            disabled={!allowSubmit}
            loading={loading}
          >
            Submit
          </Button>
          <Button
            secondary
            type="button"
            onClick={() => {
              onClose?.()
            }}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Body1BoldP css={{ marginBottom: theme.spacing.xxsmall }}>
        Status:
      </Body1BoldP>
      <Select
        label="Status"
        onSelectionChange={(status) =>
          updateState({ status: status as PrStatus })
        }
        selectedKey={state.status}
        selectionMode="single"
      >
        {Object.values(PrStatus).map((status) => (
          <ListBoxItem
            key={status}
            label={status}
          >
            {status}
          </ListBoxItem>
        ))}
      </Select>
      {error && <GqlError error={error} />}
    </Modal>
  )
}

export function PrSettingsModal(
  props: ComponentProps<typeof PrSettingsModalInner>
) {
  return (
    <ModalMountTransition open={props.open}>
      <PrSettingsModalInner {...props} />
    </ModalMountTransition>
  )
}
