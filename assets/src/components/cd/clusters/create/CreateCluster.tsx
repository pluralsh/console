import { useCallback, useRef, useState } from 'react'
import { Button, Tab, TabList } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import ModalAlt from 'components/cd/ModalAlt'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { GqlError } from 'components/utils/Alert'

import {
  Cluster,
  ClusterAttributes,
  useCreateClusterMutation,
} from '../../../../generated/graphql'

import { CreateClusterContent } from './CreateClusterContent'
import { ImportClusterContent } from './ImportClusterContent'

enum Mode {
  New = 'new',
  Import = 'import',
}

function CreateClusterModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()
  const [createMode, setCreateMode] = useState(Mode.New)
  const [importClusterAttributes, setImportClusterAttributes] =
    useState<ClusterAttributes>({} as ClusterAttributes)
  const [importAttrsValid, setImportAttrsValid] = useState(false)
  const [importCluster, setImportCluster] =
    useState<Nullable<Pick<Cluster, 'id' | 'deployToken'>>>(undefined)

  const [clusterAttributes, setClusterAttributes] = useState<ClusterAttributes>(
    {} as ClusterAttributes
  )
  const [newAttrsValid, setNewAttrsValid] = useState(false)

  const [createCluster, { loading, error }] = useCreateClusterMutation()

  const onSubmit = useCallback(() => {
    if (createMode === Mode.Import) {
      createCluster({
        variables: {
          attributes: { version: '', ...importClusterAttributes },
        },
        onCompleted: (ret) => {
          refetch?.()
          setImportCluster(ret.createCluster)
        },
      })
    } else if (createMode === Mode.New) {
      createCluster({
        variables: {
          attributes: clusterAttributes,
        },
        onCompleted: () => {
          refetch?.()
          onClose?.()
        },
      })
    }
  }, [
    clusterAttributes,
    createCluster,
    createMode,
    importClusterAttributes,
    onClose,
    refetch,
  ])
  const tabStateRef = useRef<any>()

  const tabs = (
    <div
      css={{
        display: 'flex',
        flexGrow: 1,
        justifyContent: 'end',
        marginTop: -theme.spacing.xsmall,
      }}
    >
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: createMode,
          onSelectionChange: setCreateMode as any,
        }}
      >
        <Tab key={Mode.New}>Create new</Tab>
        <Tab key={Mode.Import}>Import existing</Tab>
      </TabList>
    </div>
  )

  return (
    <ModalAlt
      header="Create a cluster"
      headerContent={tabs}
      size="large"
      style={{ padding: 0 }}
      open={open}
      portal
      onClose={() => {
        onClose?.()
      }}
      actions={
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.small,
          }}
        >
          <Button
            secondary={!(createMode === Mode.Import && importCluster)}
            primary={createMode === Mode.Import && importCluster}
            onClick={onClose}
          >
            {createMode === Mode.Import && importCluster ? 'Done' : 'Cancel'}
          </Button>
          {(createMode === Mode.New ||
            (createMode === Mode.Import && !importCluster)) && (
            <Button
              onClick={onSubmit}
              disabled={
                createMode === Mode.New ? !newAttrsValid : !importAttrsValid
              }
              loading={loading}
              primary
            >
              Create cluster
            </Button>
          )}
        </div>
      }
    >
      {createMode === Mode.New ? (
        <CreateClusterContent
          onChange={setClusterAttributes}
          onValidityChange={setNewAttrsValid}
        />
      ) : (
        <ImportClusterContent
          importCluster={importCluster}
          onChange={setImportClusterAttributes}
          onValidityChange={setImportAttrsValid}
        />
      )}
      {error && <GqlError error={error} />}
    </ModalAlt>
  )
}

export default function CreateCluster() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => setIsOpen(true)}
      >
        Create cluster
      </Button>
      <ModalMountTransition open={isOpen}>
        <CreateClusterModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          refetch={undefined}
        />
      </ModalMountTransition>
    </>
  )
}
