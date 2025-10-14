import {
  Button,
  Flex,
  FormField,
  GearTrainIcon,
  IconFrame,
  Input,
  Modal,
  Switch,
} from '@pluralsh/design-system'

import { useUpdateState } from 'components/hooks/useUpdateState'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import {
  ClusterFragment,
  ClustersRowFragment,
  useUpdateClusterMutation,
} from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import { ComponentProps, useMemo, useState } from 'react'

import { tagsToNameValue } from '../services/CreateGlobalService'
import { TagSelection } from '../services/TagSelection'

type Cluster = Pick<ClusterFragment, 'id' | 'name' | 'version'>

function ClusterSettingsModalInner({
  cluster,
  open,
  onClose,
  ...props
}: ComponentProps<typeof Modal> & {
  cluster: ClustersRowFragment
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
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState(
    { name: cluster?.name, protect: !!cluster?.protect, tags: initialTags },
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
      header={props.header || `Cluster settings – ${cluster.name}`}
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (allowSubmit) {
            mutation({
              variables: {
                id: cluster.id,
                attributes: {
                  name: state.name,
                  protect: state.protect,
                  tags: tagsToNameValue(state.tags),
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
            value={state.name}
            onChange={(e) => updateState({ name: e.target.value })}
          />
        </FormField>
        {!cluster.self && (
          <Switch
            checked={state.protect}
            onChange={(checked) => updateState({ protect: checked })}
          >
            Protect from deletion
          </Switch>
        )}
        <FormField label="Tags">
          <TagSelection
            tags={state.tags}
            setTags={(tags) => updateState({ tags })}
          />
        </FormField>
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

export default function ClusterSettings({ cluster }: { cluster: Cluster }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <IconFrame
        type="secondary"
        size="large"
        tooltip="Cluster settings"
        clickable
        icon={<GearTrainIcon />}
        onClick={() => setIsOpen(true)}
      />
      <ClusterSettingsModal
        cluster={cluster}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
