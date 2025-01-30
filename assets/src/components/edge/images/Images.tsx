import { LoopingLogo, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ReactNode } from 'react'
import {
  Types_CustomResourceObject,
  useCustomResourcesQuery,
} from '../../../generated/graphql-kubernetes.ts'
import { KubernetesClient } from '../../../helpers/kubernetes.client.ts'
import { GqlError } from '../../utils/Alert.tsx'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData.tsx'
import {
  OSArtifact,
  useDescribeOSArtifact,
  useGetManagementCluster,
} from './hooks.ts'

const OS_ARTIFACT_CRD_NAME = 'osartifacts.build.kairos.io'
const ALL_NAMESPACES = ' '

const columnHelper = createColumnHelper<OSArtifact>()

const columns = [
  columnHelper.accessor((artifact) => artifact, {
    id: 'image',
    header: 'Image',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
    cell: ({ getValue }) => {
      const artifact = getValue()

      return (
        <>
          {artifact.spec.outputImage.repository}:{artifact.spec.outputImage.tag}
        </>
      )
    },
  }),
  columnHelper.accessor((artifact) => artifact.spec.outputImage.registry, {
    id: 'registry',
    header: 'Registry',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((artifact) => artifact.spec.outputImage.username, {
    id: 'user',
    header: 'SSH User',
    meta: { truncate: true, gridTemplate: 'minmax(100px,.5fr)' },
    cell: ({ getValue }) => getValue(),
  }),
  // columnHelper.accessor((artifact) => artifact, {
  //   id: 'credentials',
  //   header: 'Credentials',
  //   meta: { truncate: true, gridTemplate: 'minmax(150px, .25fr)' },
  //   cell: ({ getValue, table }) => {
  //     const artifact = getValue()
  //     const { cluster } = table.options.meta as {
  //       cluster: Cluster
  //     }
  //
  //     return (
  //       <Button
  //         small
  //         secondary
  //         as={Link}
  //         to={
  //           getKubernetesResourcePath({
  //             clusterId: cluster?.id ?? '',
  //             name: artifact.spec.outputImage.passwordSecretKeyRef.name,
  //             namespace: 'osbuilder',
  //             kind: 'secret',
  //             group: '',
  //             version: 'v1',
  //           }) ?? ''
  //         }
  //       >
  //         View secret
  //       </Button>
  //     )
  //   },
  // }),
  columnHelper.accessor((artifact) => artifact, {
    id: 'status',
    header: 'Status',
    meta: { truncate: true, gridTemplate: '100px' },
    cell: ({ getValue }) => {
      const artifact = getValue()

      return <>{artifact.status.phase}</>
    },
  }),
]

export default function Images(): ReactNode {
  const { cluster } = useGetManagementCluster()
  const { data: artifacts, error: artifactsListError } =
    useCustomResourcesQuery({
      client: KubernetesClient(cluster?.id ?? ''),
      skip: !cluster?.id,
      variables: { name: OS_ARTIFACT_CRD_NAME, namespace: ALL_NAMESPACES },
      pollInterval: 30_000,
    })

  const { items, error: describeError } = useDescribeOSArtifact({
    clusterId: cluster?.id,
    artifacts: (artifacts?.handleGetCustomResourceObjectList?.items ??
      []) as Array<Types_CustomResourceObject>,
  })

  if (artifactsListError) return <GqlError error={artifactsListError} />
  if (describeError) return <GqlError error={describeError} />
  if (!artifacts || !items) return <LoopingLogo />

  return (
    <Table
      fullHeightWrap
      columns={columns}
      reactTableOptions={{ meta: { cluster } }}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      data={items}
      virtualizeRows
    />
  )
}
