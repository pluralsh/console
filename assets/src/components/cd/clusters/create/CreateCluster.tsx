import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, Tab, TabList } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import ModalAlt from 'components/cd/ModalAlt'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { GqlError } from 'components/utils/Alert'

import {
  CloudSettingsAttributes,
  Cluster,
  ClusterAttributes,
  useCreateClusterMutation,
} from '../../../../generated/graphql'

import { CreateClusterContent } from './CreateClusterContent'
import { ImportClusterContent } from './ImportClusterContent'
import { ProviderCloud } from './types'

enum Mode {
  New = 'new',
  Import = 'import',
}

export const SUPPORTED_CLOUDS = [ProviderCloud.GCP]

type NewClusterContextT = {
  attributes: ClusterAttributes
  setAttributes: Dispatch<SetStateAction<ClusterAttributes>>
  setValid: Dispatch<SetStateAction<boolean>>
  setGcpSettings?: (settings: CloudSettingsAttributes['gcp']) => void
  setAzureSettings?: (settings: CloudSettingsAttributes['azure']) => void
  setAwsSettings?: (settings: CloudSettingsAttributes['aws']) => void
}

type CreateClusterContextT = {
  create: NewClusterContextT
  import: NewClusterContextT
}

const CreateClusterContext = createContext<CreateClusterContextT | undefined>(
  undefined
)

export const useCreateClusterContext = () => {
  const ctx = useContext(CreateClusterContext)

  if (!ctx) {
    throw Error(
      'useCreateClusterContext() must be used within a CreateClusterContext provider'
    )
  }

  return ctx
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

  const cloudSetters = useMemo(
    () => ({
      setAwsSettings: (settings) => {
        setClusterAttributes((attrs) => ({
          ...attrs,
          cloudSettings: { ...attrs.cloudSettings, aws: settings },
        }))
      },
      setGcpSettings: (settings) => {
        setClusterAttributes((attrs) => ({
          ...attrs,
          cloudSettings: { ...attrs.cloudSettings, gcp: settings },
        }))
      },
      setAzureSettings: (settings) => {
        setClusterAttributes((attrs) => ({
          ...attrs,
          cloudSettings: { ...attrs.cloudSettings, azure: settings },
        }))
      },
    }),
    []
  )

  const contextVal = useMemo<CreateClusterContextT>(
    () => ({
      create: {
        attributes: clusterAttributes,
        setAttributes: setClusterAttributes,
        setValid: setNewAttrsValid,
        ...cloudSetters,
      },
      import: {
        attributes: importClusterAttributes,
        setAttributes: setImportClusterAttributes,
        setValid: setImportAttrsValid,
      },
    }),
    [cloudSetters, clusterAttributes, importClusterAttributes]
  )
  const [createCluster, { loading, error }] = useCreateClusterMutation()

  const onSubmit = useCallback(() => {
    if (createMode === Mode.Import) {
      createCluster({
        variables: {
          attributes: importClusterAttributes,
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
      style={{ padding: 0, position: 'absolute', top: '20%' }}
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
      <CreateClusterContext.Provider value={contextVal}>
        {createMode === Mode.New ? (
          <CreateClusterContent />
        ) : (
          <ImportClusterContent
            importCluster={importCluster}
            onChange={setImportClusterAttributes}
            onValidityChange={setImportAttrsValid}
          />
        )}
      </CreateClusterContext.Provider>
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
