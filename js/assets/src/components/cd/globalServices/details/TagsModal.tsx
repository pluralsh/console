import { Button, FormField, Modal } from '@pluralsh/design-system'
import isEqual from 'lodash/isEqual'
import { ComponentProps, useMemo } from 'react'
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
  ...props
}: ComponentProps<typeof Modal> & {
  globalService: Nullable<GlobalServiceFragment>
}) {
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
    onCompleted: () => onClose?.(),
    refetchQueries: ['GetGlobalService'],
    awaitRefetchQueries: true,
  })

  if (!globalService) return null

  return (
    <Modal
      asForm
      size="large"
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
