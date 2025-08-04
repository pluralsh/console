import { Button, Code } from '@pluralsh/design-system'
import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from 'react'
import { useTheme } from 'styled-components'

import { CloudSettingsAttributes, ClusterAttributes } from 'generated/graphql'

import ModalAlt, { StepH } from 'components/cd/ModalAlt'
import { useOpenTransition } from 'components/hooks/suspense/useOpenTransition'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { NameVersionHandle } from './NameVersionHandle'
import { ProviderCloud } from './types'

export enum ClusterCreateMode {
  New = 'new',
  Import = 'import',
}

export const ORDERED_CLOUDS = [
  ProviderCloud.AWS,
  ProviderCloud.GCP,
  ProviderCloud.Azure,
]

type NewClusterContextT = {
  attributes: Partial<ClusterAttributes>
  setAttributes: Dispatch<SetStateAction<Partial<ClusterAttributes>>>
  setGcpSettings?: (settings: CloudSettingsAttributes['gcp']) => void
  setAzureSettings?: (settings: CloudSettingsAttributes['azure']) => void
  setAwsSettings?: (settings: CloudSettingsAttributes['aws']) => void
}

type CreateClusterContextT = {
  [ClusterCreateMode.New]: NewClusterContextT
  [ClusterCreateMode.Import]: NewClusterContextT
}
export type CloudSettings<T extends keyof CloudSettingsAttributes> =
  NonNullable<CloudSettingsAttributes[T]>

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

// function CreateClusterModal({
//   open,
//   onClose,
//   refetch,
// }: {
//   open: boolean
//   onClose: Nullable<() => void>
//   refetch: Nullable<() => void>
// }) {
//   const theme = useTheme()
//   const [createMode, setCreateMode] = useState(ClusterCreateMode.New)
//   const [importClusterAttributes, setImportClusterAttributes] = useState<
//     Partial<ClusterAttributes>
//   >({})
//   const [importAttrsValid, setImportAttrsValid] = useState(false)
//   const [importCluster, setImportCluster] =
//     useState<Nullable<Pick<Cluster, 'id' | 'deployToken'>>>(undefined)

//   const { data: clusterProvidersQuery } = useClusterProvidersSuspenseQuery()
//   const clusterProviders = useMemo(
//     () =>
//       sortBy(
//         mapExistingNodes(clusterProvidersQuery?.clusterProviders)
//           .filter((p) => ORDERED_CLOUDS.some((cloud) => cloud === p.cloud))
//           .filter((p) => !p.deletedAt),
//         (p) => ORDERED_CLOUDS.indexOf(p.cloud as ProviderCloud)
//       ),
//     [clusterProvidersQuery?.clusterProviders]
//   )
//   const initialProviderId: string | undefined = clusterProviders?.[0]?.id
//   const [clusterAttributes, setClusterAttributes] = useState<
//     Partial<ClusterAttributes>
//   >(initialProviderId ? { providerId: initialProviderId } : {})

//   const currentProvider = useMemo(
//     () => clusterProviders.find((p) => p.id === clusterAttributes.providerId),
//     [clusterAttributes.providerId, clusterProviders]
//   )
//   const newAttrsValid = attributesAreValid(
//     clusterAttributes,
//     currentProvider?.cloud
//   )

//   const cloudSetters = useMemo(
//     () => ({
//       setAwsSettings: (settings) => {
//         setClusterAttributes((attrs) => ({
//           ...attrs,
//           cloudSettings: { ...attrs.cloudSettings, aws: settings },
//         }))
//       },
//       setGcpSettings: (settings) => {
//         setClusterAttributes((attrs) => ({
//           ...attrs,
//           cloudSettings: { ...attrs.cloudSettings, gcp: settings },
//         }))
//       },
//       setAzureSettings: (settings) => {
//         setClusterAttributes((attrs) => ({
//           ...attrs,
//           cloudSettings: { ...attrs.cloudSettings, azure: settings },
//         }))
//       },
//     }),
//     []
//   )

//   const contextVal = useMemo<CreateClusterContextT>(
//     () => ({
//       new: {
//         attributes: clusterAttributes,
//         setAttributes: setClusterAttributes,
//         ...cloudSetters,
//       },
//       import: {
//         attributes: importClusterAttributes,
//         setAttributes: setImportClusterAttributes,
//       },
//     }),
//     [cloudSetters, clusterAttributes, importClusterAttributes]
//   )
//   const [createCluster, { loading, error }] = useCreateClusterMutation()

//   const onSubmit = useCallback(() => {
//     if (createMode === ClusterCreateMode.Import) {
//       createCluster({
//         variables: {
//           attributes: importClusterAttributes as ClusterAttributes,
//         },
//         onCompleted: (ret) => {
//           refetch?.()
//           setImportCluster(ret.createCluster)
//         },
//       })
//     } else if (createMode === ClusterCreateMode.New) {
//       createCluster({
//         variables: {
//           attributes: clusterAttributes as ClusterAttributes,
//         },
//         onCompleted: () => {
//           refetch?.()
//           onClose?.()
//         },
//       })
//     }
//   }, [
//     clusterAttributes,
//     createCluster,
//     createMode,
//     importClusterAttributes,
//     onClose,
//     refetch,
//   ])
//   const tabStateRef = useRef<any>()

//   const tabs = (
//     <div
//       css={{
//         display: 'flex',
//         flexGrow: 1,
//         justifyContent: 'end',
//         marginTop: -theme.spacing.xsmall,
//       }}
//     >
//       <TabList
//         stateRef={tabStateRef}
//         stateProps={{
//           orientation: 'horizontal',
//           selectedKey: createMode,
//           onSelectionChange: setCreateMode as any,
//         }}
//       >
//         <Tab key={ClusterCreateMode.New}>Create new</Tab>
//         <Tab key={ClusterCreateMode.Import}>Import existing</Tab>
//       </TabList>
//     </div>
//   )

//   return (
//     <ModalAlt
//       header="Create a cluster"
//       headerContent={tabs}
//       size="large"
//       style={{ padding: 0, position: 'absolute' }}
//       open={open}
//       onClose={() => {
//         onClose?.()
//       }}
//       actions={
//         <div
//           css={{
//             display: 'flex',
//             gap: theme.spacing.small,
//           }}
//         >
//           <Button
//             secondary={
//               !(createMode === ClusterCreateMode.Import && importCluster)
//             }
//             primary={createMode === ClusterCreateMode.Import && importCluster}
//             onClick={onClose}
//           >
//             {createMode === ClusterCreateMode.Import && importCluster
//               ? 'Done'
//               : 'Cancel'}
//           </Button>
//           {createMode === ClusterCreateMode.New && (
//             <Button
//               onClick={onSubmit}
//               disabled={
//                 createMode === ClusterCreateMode.New
//                   ? !newAttrsValid
//                   : !importAttrsValid
//               }
//               loading={loading}
//               primary
//             >
//               Create cluster
//             </Button>
//           )}
//         </div>
//       }
//     >
//       <CreateClusterContext.Provider value={contextVal}>
//         <TabPanel stateRef={tabStateRef}>
//           {createMode === ClusterCreateMode.New ? (
//             <CreateClusterContent providers={clusterProviders} />
//           ) : (
//             <ImportClusterContent
//               importCluster={importCluster}
//               onChange={setImportClusterAttributes}
//               onValidityChange={setImportAttrsValid}
//             />
//           )}
//         </TabPanel>
//       </CreateClusterContext.Provider>
//       {error && <GqlError error={error} />}
//     </ModalAlt>
//   )
// }

function CreateClusterModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [name, setName] = useState<string>('')

  return (
    <ModalAlt
      header="Import an existing cluster"
      size="large"
      style={{ padding: 0, position: 'absolute' }}
      open={open}
      onClose={() => {
        onClose?.()
      }}
    >
      <NameVersionHandle {...{ name, setName }} />
      <div>
        <StepH css={{ marginBottom: theme.spacing.small }}>
          Run the below command to create a new cluster
        </StepH>
        <Code>{`plural cd clusters bootstrap --name ${
          name || '{your-cluster-name}'
        }`}</Code>
      </div>
      <div>
        <StepH css={{ marginBottom: theme.spacing.small }}>
          Tip: use the following command to reinstall if the initial
          installation fails
        </StepH>
        <Code>{`plural cd clusters reinstall @${
          name || '{your-cluster-name}'
        }`}</Code>
      </div>
    </ModalAlt>
  )
}
export default function CreateCluster() {
  const [isOpen, setIsOpen] = useState(false)
  const { buttonProps } = useOpenTransition(isOpen, setIsOpen)

  return (
    <>
      <Button
        primary
        {...buttonProps}
      >
        Import Cluster
      </Button>
      <ModalMountTransition open={isOpen}>
        <CreateClusterModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          // refetch={undefined}
        />
      </ModalMountTransition>
    </>
  )
}
