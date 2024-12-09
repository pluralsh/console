import { Button, FormField, Modal } from '@pluralsh/design-system'
import isEqual from 'lodash/isEqual'
import { ComponentProps, Dispatch, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  GlobalServiceFragment,
  useUpdateGlobalServiceMutation,
} from '../../../../generated/graphql.ts'
import { useUpdateState } from '../../../hooks/useUpdateState.tsx'
import { GqlError } from '../../../utils/Alert.tsx'
import { ModalMountTransition } from '../../../utils/ModalMountTransition.tsx'
import { tagsToNameValue } from '../../services/CreateGlobalService.tsx'
import { TagSelection } from '../../services/TagSelection.tsx'

interface TagsModalProps {
  globalService: GlobalServiceFragment
  refetch: Dispatch<void>
}

export function TagsModal(props: ComponentProps<typeof TagsModalInner>) {
  return (
    <ModalMountTransition open={props.open}>
      <TagsModalInner {...props} />
    </ModalMountTransition>
  )
}

function TagsModalInner({
  open,
  onClose,
  globalService,
  refetch,
  ...props
}: ComponentProps<typeof Modal> & TagsModalProps) {
  const theme = useTheme()
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        globalService?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [globalService?.tags]
  )

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({ tags: initialTags }, { tags: (a, b) => !isEqual(a, b) })
  const [mutation, { loading, error }] = useUpdateGlobalServiceMutation({
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  if (!globalService) {
    return null
  }

  return (
    <Modal
      form
      open={open}
      onClose={onClose}
      header="Edit tags"
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (hasUpdates) {
            mutation({
              variables: {
                id: globalService.id,
                attributes: {
                  tags: tagsToNameValue(state.tags),
                  name: globalService.name,
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
            disabled={!hasUpdates}
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
