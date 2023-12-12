import {
  Button,
  GearTrainIcon,
  IconFrame,
  Modal,
  Switch,
} from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import {
  ClusterFragment,
  ClustersRowFragment,
  useUpdateClusterMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { useTheme } from 'styled-components'

type Cluster = Pick<ClusterFragment, 'id' | 'name' | 'version'>

function ClusterSettingsModalInner({
  cluster,
  open,
  onClose,
  ...props
}: ComponentProps<typeof Modal> & {
  cluster: ClustersRowFragment
}) {
  const theme = useTheme()
  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({
    protect: !!cluster?.protect,
  })
  const [mutation, { loading }] = useUpdateClusterMutation({
    variables: { id: cluster.id, attributes: { protect: state.protect } },
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
            mutation()
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
      <Switch
        checked={state.protect}
        onChange={(checked) => updateState({ protect: checked })}
      >
        Protect from deletion
      </Switch>
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
