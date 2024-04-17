import React, { ReactElement, useEffect, useMemo } from 'react'
import {
  Outlet,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'

import { MetadataSidecar, useDefaultColumns } from '../common/utils'
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
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import Conditions from '../common/Conditions'
import { ResourceList } from '../common/ResourceList'
import { useCluster } from '../Cluster'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { DataSelectInputs, useDataSelect } from '../common/DataSelect'

import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './CustomResourceDefinitions'
import { CRDEstablishedChip } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Objects' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CustomResourceDefinition(): ReactElement {
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

export function CustomRersourceDefinitionObjects(): ReactElement {
  const crd = useOutletContext() as CustomResourceDefinitionT
  const namespaced = crd.scope.toLowerCase() === 'namespaced'
  const dataSelect = useDataSelect()
  const { name } = useParams()
  const [params] = useSearchParams()
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      ...(namespaced ? [colNamespace] : []),
      colLabels,
      colCreationTimestamp,
    ],
    [namespaced, colName, colNamespace, colLabels, colCreationTimestamp]
  )

  useEffect(
    () => dataSelect.setNamespaced(namespaced),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataSelect.setNamespaced, namespaced]
  )

  // TODO: Update param when namespace changes.
  useEffect(
    () => dataSelect.setNamespace(params.get(NAMESPACE_PARAM) ?? ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataSelect.setNamespace, params]
  )

  const headerContent = useMemo(
    () => <DataSelectInputs dataSelect={dataSelect} />,
    [dataSelect]
  )

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
      query={useCustomResourcesQuery}
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

export function CustomResourceDefinitionConditions(): ReactElement {
  const { conditions } = useOutletContext() as CustomResourceDefinitionT

  return <Conditions conditions={conditions} />
}
