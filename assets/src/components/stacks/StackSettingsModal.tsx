import { Button, FormField, Modal } from '@pluralsh/design-system'
import isEqual from 'lodash/isEqual'
import { ComponentProps, useMemo } from 'react'
import { useTheme } from 'styled-components'

import { StackFragment, useUpdateStackMutation } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { tagsToNameValue } from 'components/cd/services/CreateGlobalService'
import { TagSelection } from 'components/cd/services/TagSelection'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { deepOmitKey } from 'utils/deepOmitKey'

export function StackSettingsModal(
  props: ComponentProps<typeof StackSettingsModalInner>
) {
  return (
    <ModalMountTransition open={!!props.open}>
      <StackSettingsModalInner {...props} />
    </ModalMountTransition>
  )
}

function StackSettingsModalInner({
  stack,
  open,
  onClose,
  ...props
}: ComponentProps<typeof Modal> & {
  stack: StackFragment
}) {
  const theme = useTheme()
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        stack?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [stack?.tags]
  )

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState(
    {
      tags: initialTags,
    },
    {
      tags: (a, b) => !isEqual(a, b),
    }
  )
  const [mutation, { loading, error }] = useUpdateStackMutation({
    onCompleted: () => {
      onClose?.()
    },
  })

  if (!stack) {
    return null
  }
  const allowSubmit = hasUpdates

  return (
    <Modal
      asForm
      size="large"
      open={open}
      onClose={onClose}
      header={props.header || `Stack settings - ${stack.name}`}
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (allowSubmit) {
            mutation({
              variables: {
                id: stack.id ?? '',
                attributes: {
                  clusterId: stack.cluster?.id ?? '',
                  name: stack.name,
                  configuration: deepOmitKey(
                    stack.configuration,
                    '__typename' as const
                  )!,
                  git: deepOmitKey(stack.git, '__typename' as const)!,
                  repositoryId: stack.repository?.id ?? '',
                  type: stack.type,
                  tags: tagsToNameValue(state.tags),
                },
              },
            })
          }
        },
      }}
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
      {...props}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <FormField label="Tags">
          <TagSelection
            tags={state.tags}
            setTags={(tags) => updateState({ tags })}
          />
        </FormField>
        {error && <GqlError error={error} />}
      </div>
    </Modal>
  )
}
