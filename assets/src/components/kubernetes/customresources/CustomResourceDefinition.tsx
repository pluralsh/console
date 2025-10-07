import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { ReactElement, useEffect, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  CustomResourceDefinitionQueryVariables,
  Types_CustomResourceDefinitionDetail as CustomResourceDefinitionT,
  Types_CustomResourceObjectList as CustomResourceListT,
  CustomResourcesDocument,
  CustomResourcesQuery,
  CustomResourcesQueryVariables,
  Types_CustomResourceObjectDetail as CustomResourceT,
  useCustomResourceDefinitionQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import Conditions from '../common/Conditions'
import { DataSelectInputs, useDataSelect } from '../common/DataSelect'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'

import { Kind } from '../common/types'

import { MetadataSidecar, useDefaultColumns } from '../common/utils'

import { getBreadcrumbs } from './CustomResourceDefinitions'
import { CRDEstablishedChip } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Objects' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CustomResourceDefinition(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useCustomResourceDefinitionQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as CustomResourceDefinitionQueryVariables,
  })

  const crd = data?.handleGetCustomResourceDefinitionDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.CustomResourceDefinition,
            name
          ),
        },
      ],
      [cluster, clusterId, name]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={crd}>
          <SidecarItem heading="Group">{crd?.group}</SidecarItem>
          <SidecarItem heading="Version">{crd?.version}</SidecarItem>
          <SidecarItem heading="Kind">{crd?.names.kind}</SidecarItem>
          <SidecarItem heading="Scope">{crd?.scope}</SidecarItem>
          <SidecarItem heading="Established">
            <CRDEstablishedChip established={crd?.established} />
          </SidecarItem>
          <SidecarItem heading="Subresources">
            <ChipList
              size="small"
              limit={5}
              values={crd?.subresources ?? []}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={crd} />
    </ResourceDetails>
  )
}

const columnHelper = createColumnHelper<CustomResourceT>()

export function CustomResourceDefinitionObjects() {
  const crd = useOutletContext() as CustomResourceDefinitionT
  const namespaced = crd?.scope.toLowerCase() === 'namespaced'
  const dataSelect = useDataSelect()
  const { name } = useParams()
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      ...(namespaced ? [colNamespace] : []),
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [
      namespaced,
      colName,
      colNamespace,
      colLabels,
      colCreationTimestamp,
      colAction,
    ]
  )

  useEffect(() => {
    dataSelect.setNamespaced(namespaced)
  }, [namespaced, dataSelect])

  const headerContent = useMemo(() => <DataSelectInputs />, [])

  useSetPageHeaderContent(headerContent)

  return (
    <ResourceList<
      CustomResourceListT,
      CustomResourceT,
      CustomResourcesQuery,
      CustomResourcesQueryVariables
    >
      namespaced={namespaced}
      customResource
      columns={columns}
      queryDocument={CustomResourcesDocument}
      queryOptions={{
        variables: {
          filterBy: `name,${dataSelect.filter}`,
          namespace: isEmpty(dataSelect.namespace) ? ' ' : dataSelect.namespace, // ' ' selects all namespaces.
          name,
        } as CustomResourcesQueryVariables,
      }}
      queryName="handleGetCustomResourceObjectList"
      itemsKey="items"
    />
  )
}

export function CustomResourceDefinitionConditions(): ReactElement<any> {
  const { conditions } = useOutletContext() as CustomResourceDefinitionT

  return <Conditions conditions={conditions} />
}
