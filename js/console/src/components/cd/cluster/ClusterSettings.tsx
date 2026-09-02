import {
  Button,
  Flex,
  FormField,
  Input,
  Modal,
  Switch,
} from '@pluralsh/design-system'

import { useUpdateState } from 'components/hooks/useUpdateState'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import {
  ClustersRowFragment,
  useUpdateClusterMutation,
} from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import { ComponentProps, useMemo } from 'react'

import { tagsToNameValue } from '../services/CreateGlobalService'
import { TagSelection } from '../services/TagSelection'

function ClusterSettingsModalInner({
  cluster,
  open,
  onClose,
  ...props
}: ComponentProps<typeof Modal> & {
  cluster: Nullable<ClustersRowFragment>
}) {
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        cluster?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [cluster?.tags]
  )

  const {
    state: { name, protect, tags, disableAi },
    update: updateState,
    hasUpdates,
  } = useUpdateState(
    {
      name: cluster?.name,
      protect: !!cluster?.protect,
      tags: initialTags,
      disableAi: !!cluster?.disableAi,
    },
    { tags: (a, b) => !isEqual(a, b) }
  )
  const [mutation, { loading, error }] = useUpdateClusterMutation({
    onCompleted: () => onClose?.(),
  })

  if (!cluster) return null

  const allowSubmit = hasUpdates

  return (
    <Modal
      asForm
      size="large"
      open={open}
      onClose={onClose}
      header={props.header || `Cluster settings - ${cluster.name}`}
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (allowSubmit) {
            mutation({
              variables: {
                id: cluster.id,
                attributes: {
                  name,
                  protect,
                  tags: tagsToNameValue(tags),
                  disableAi,
                },
              },
            })
          }
        },
      }}
      actions={
        <Flex
          direction="row-reverse"
          gap="medium"
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
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </Flex>
      }
      {...props}
    >
      <Flex
        direction="column"
        gap="large"
      >
        <FormField label="Name">
          <Input
            value={name}
            onChange={(e) => updateState({ name: e.target.value })}
          />
        </FormField>
        {!cluster.self && (
          <Switch
            checked={protect}
            onChange={(checked) => updateState({ protect: checked })}
          >
            Protect from deletion
          </Switch>
        )}
        <FormField label="Tags">
          <TagSelection
            tags={tags}
            setTags={(tags) => updateState({ tags })}
          />
        </FormField>
        <Switch
          checked={disableAi}
          onChange={(checked) => updateState({ disableAi: checked })}
        >
          Disable AI insights
        </Switch>
        {error && <GqlError error={error} />}
      </Flex>
    </Modal>
  )
}

export function ClusterSettingsModal(
  props: ComponentProps<typeof ClusterSettingsModalInner>
) {
  return (
    <ModalMountTransition open={props.open}>
      <ClusterSettingsModalInner {...props} />
    </ModalMountTransition>
  )
}
