import { ReactElement, useCallback, useState } from 'react'
import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  ClusterAttributes,
  useCreateClusterMutation,
} from '../../../../generated/graphql'

import { CreateClusterContent } from './CreateClusterContent'

export default function CreateCluster(): ReactElement {
  const theme = useTheme()

  const [isOpen, setIsOpen] = useState(false)
  const [clusterAttributes, setClusterAttributes] = useState<ClusterAttributes>(
    {} as ClusterAttributes
  )
  const [valid, setValid] = useState(false)

  const [createCluster, { loading }] = useCreateClusterMutation()

  const onClose = useCallback(() => setIsOpen(false), [])
  const onSubmit = useCallback(() => {
    createCluster({
      variables: {
        attributes: clusterAttributes,
      },
      onCompleted: onClose,
    })
  }, [clusterAttributes, createCluster, onClose])

  return (
    <>
      <Button
        primary
        onClick={() => setIsOpen(true)}
      >
        Create cluster
      </Button>
      <Modal
        header="Create a cluster"
        size="large"
        style={{ padding: 0 }}
        BackdropProps={{
          justifyContent: 'flex-start',
          paddingTop: 128,
        }}
        open={isOpen}
        portal
        onClose={onClose}
        actions={
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.small,
            }}
          >
            <Button
              secondary
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!valid}
              loading={loading}
              primary
            >
              Create cluster
            </Button>
          </div>
        }
      >
        <CreateClusterContent
          onChange={setClusterAttributes}
          onValidityChange={setValid}
        />
      </Modal>
    </>
  )
}
