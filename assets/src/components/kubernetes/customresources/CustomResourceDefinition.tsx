import React, { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'

import {
  MetadataSidecar,
  useDefaultColumns,
  useKubernetesCluster,
} from '../utils'
import {
  CustomResourceDefinitionQueryVariables,
  Types_CustomResourceDefinitionDetail as CustomResourceDefinitionT,
  Types_CustomResourceObjectList as CustomResourceListT,
  Types_CustomResourceObjectDetail as CustomResourceT,
  CustomResourcesQuery,
  CustomResourcesQueryVariables,
  useCustomResourceDefinitionQuery,
  useCustomResourcesQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../ResourceDetails'

import Conditions from '../common/Conditions'

import { ResourceList } from '../ResourceList'

import { getBreadcrumbs } from './CustomResourceDefinitions'
import { CRDEstablishedChip } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Objects' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CustomResourceDefinition(): ReactElement {
  const cluster = useKubernetesCluster()
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
            'customresourcedefinition',
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
              emptyState={<div>None</div>}
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

export function CustomRersourceDefinitionObjects(): ReactElement {
  // TODO: Add namespace selector.
  // TODO: Show namespace column only if scope is namespaced.
  const { name, namespace = ' ' } = useParams() // ' ' selects all namespaces.
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      CustomResourceListT,
      CustomResourceT,
      CustomResourcesQuery,
      CustomResourcesQueryVariables
    >
      namespaced // TODO
      customResource
      columns={columns}
      query={useCustomResourcesQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as CustomResourcesQueryVariables,
      }}
      queryName="handleGetCustomResourceObjectList"
      itemsKey="items"
    />
  )
}

export function CustomResourceDefinitionConditions(): ReactElement {
  const { conditions } = useOutletContext() as CustomResourceDefinitionT

  return <Conditions conditions={conditions} />
}
