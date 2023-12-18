import {
  Button,
  FormField,
  GearTrainIcon,
  IconFrame,
  Modal,
  Switch,
} from '@pluralsh/design-system'
import { ComponentProps, useMemo, useState } from 'react'
import isEqual from 'lodash/isEqual'
import { useTheme } from 'styled-components'

import {
  ClusterFragment,
  ClustersRowFragment,
  useUpdateClusterMutation,
} from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useUpdateState } from 'components/hooks/useUpdateState'

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
  console.log('cluster.tags', cluster.tags)
  const theme = useTheme()
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
    {
      protect: !!cluster?.protect,
      tags: initialTags,
    },
    {
      tags: (a, b) => !isEqual(a, b),
    }
  )
  const [mutation, { loading, error }] = useUpdateClusterMutation({
    onCompleted: () => {
      onClose?.()
    },
  })

  if (!cluster) {
    return null
  }
  const allowSubmit = hasUpdates

  return (
    <Modal
      asForm
      portal
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
                  protect: state.protect,
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
          gap: theme.spacing.medium,
        }}
      >
        <Switch
          checked={state.protect}
          onChange={(checked) => updateState({ protect: checked })}
        >
          Protect from deletion
        </Switch>
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
